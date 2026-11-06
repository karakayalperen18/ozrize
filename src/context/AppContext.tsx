import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { CUSTOMER, CUSTOMERS, PRODUCTS, SEED_QUOTES, productById } from '../data/mockData';
import type {
  CartLine,
  CounterOffer,
  CreditCheck,
  Customer,
  CustomerCredit,
  PaymentTerm,
  Product,
  QuoteItem,
  QuoteRequest,
  QuoteSubmitResult,
  QuoteTotals,
  UserRole,
} from '../types/b2b';
import {
  MARGIN_THRESHOLD_PCT,
  buildQuoteItem,
  computeTotals,
  evaluateCredit,
  qualifiesForAutoApproval,
} from '../utils/pricing';
import { money } from '../utils/format';

interface CounterOfferInput {
  unitPrice: number;
  paymentTerm: PaymentTerm;
  note: string;
}

interface AppContextValue {
  /* identity & role */
  role: UserRole;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;

  /* master data */
  customer: Customer;
  credit: CustomerCredit;
  products: Product[];
  customers: Customer[];

  /* cart */
  cart: CartLine[];
  cartItems: QuoteItem[];
  totals: QuoteTotals;
  creditCheck: CreditCheck;
  paymentTerm: PaymentTerm;
  setPaymentTerm: (term: PaymentTerm) => void;
  quoteNote: string;
  setQuoteNote: (note: string) => void;
  addToCart: (productId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setTargetPrice: (productId: string, price: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  lineFor: (productId: string) => CartLine | undefined;

  /* quotes */
  quotes: QuoteRequest[];
  pendingQuotes: number;
  lastSubmit: QuoteSubmitResult | null;
  submitQuote: () => QuoteSubmitResult;
  approveQuote: (quoteId: string, discountPct?: number) => void;
  rejectQuote: (quoteId: string, note?: string) => void;
  sendCounterOffer: (quoteId: string, input: CounterOfferInput) => void;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

let quoteSequence = 2060;

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>(SEED_QUOTES);
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>('TERM_30');
  const [quoteNote, setQuoteNote] = useState('');
  const [lastSubmit, setLastSubmit] = useState<QuoteSubmitResult | null>(null);
  const [credit, setCredit] = useState<CustomerCredit>(CUSTOMER.credit);
  const submissionLock = useRef(false);

  const customer = useMemo<Customer>(() => ({ ...CUSTOMER, credit }), [credit]);

  // Portföy: tüm müşteriler; mevcut müşterinin kredi profili canlı state'ten gelir.
  const customers = useMemo<Customer[]>(
    () => CUSTOMERS.map((item) => (item.id === CUSTOMER.id ? { ...item, credit } : item)),
    [credit],
  );

  const toggleRole = useCallback(() => {
    setRole((current) => (current === 'CUSTOMER' ? 'ADMIN' : 'CUSTOMER'));
  }, []);

  /* ------------------------------------------------------------------ cart */

  const addToCart = useCallback((productId: string, quantity?: number) => {
    const product = productById(productId);
    if (!product) return;

    setCart((current) => {
      const existing = current.find((line) => line.productId === productId);
      const requested = quantity ?? product.moq;

      if (existing) {
        return current.map((line) =>
          line.productId === productId
            ? {
                ...line,
                quantity: Math.min(
                  Math.max(line.quantity + requested, product.moq),
                  product.stockQuantity,
                ),
              }
            : line,
        );
      }

      return [
        ...current,
        {
          productId,
          quantity: Math.min(Math.max(requested, product.moq), product.stockQuantity),
        },
      ];
    });
  }, []);

  const setLineQuantity = useCallback((productId: string, quantity: number) => {
    const product = productById(productId);
    if (!product) return;

    const clamped = Math.min(Math.max(quantity, product.moq), product.stockQuantity);
    setCart((current) =>
      current.map((line) =>
        line.productId === productId ? { ...line, quantity: clamped } : line,
      ),
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        setCart((current) => current.filter((line) => line.productId !== productId));
        return;
      }
      setLineQuantity(productId, quantity);
    },
    [setLineQuantity],
  );

  const setTargetPrice = useCallback((productId: string, price: number) => {
    setCart((current) =>
      current.map((line) =>
        line.productId === productId
          ? { ...line, targetUnitPrice: Number.isFinite(price) && price > 0 ? price : undefined }
          : line,
      ),
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((current) => current.filter((line) => line.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setQuoteNote('');
    setLastSubmit(null);
  }, []);

  const isInCart = useCallback(
    (productId: string) => cart.some((line) => line.productId === productId),
    [cart],
  );

  const lineFor = useCallback(
    (productId: string) => cart.find((line) => line.productId === productId),
    [cart],
  );

  /* --------------------------------------------------------------- derived */

  const cartItems = useMemo<QuoteItem[]>(() => {
    return cart
      .map((line) => {
        const product = productById(line.productId);
        if (!product) return undefined;
        return buildQuoteItem(product, line);
      })
      .filter((item): item is QuoteItem => Boolean(item));
  }, [cart]);

  const totals = useMemo<QuoteTotals>(() => computeTotals(cartItems), [cartItems]);

  const creditCheck = useMemo<CreditCheck>(
    () => evaluateCredit(credit, totals.requestedTotal),
    [credit, totals.requestedTotal],
  );

  const pendingQuotes = useMemo(
    () => quotes.filter((quote) => quote.status === 'PENDING').length,
    [quotes],
  );

  /* ---------------------------------------------------------------- quotes */

  const submitQuote = useCallback((): QuoteSubmitResult => {
    if (submissionLock.current) {
      return {
        ok: false,
        reason: 'EMPTY_CART',
        message: 'Teklif gönderimi zaten işleniyor.',
      };
    }

    if (cartItems.length === 0) {
      const failure: QuoteSubmitResult = {
        ok: false,
        reason: 'EMPTY_CART',
        message: 'Teklif oluşturmak için sepete en az bir ürün ekleyin.',
      };
      setLastSubmit(failure);
      return failure;
    }

    const moqViolation = cartItems.find((item) => {
      const product = productById(item.productId);
      return product ? item.quantity < product.moq : true;
    });

    if (moqViolation) {
      const failure: QuoteSubmitResult = {
        ok: false,
        reason: 'MOQ',
        message: `${moqViolation.name} için minimum sipariş miktarı karşılanmadı.`,
      };
      setLastSubmit(failure);
      return failure;
    }

    if (creditCheck.exceeds) {
      const failure: QuoteSubmitResult = {
        ok: false,
        reason: 'CREDIT_LIMIT',
        message: `Kredi limiti aşılıyor. Kullanılabilir limit ${money(
          credit.available,
          0,
        )}, talep edilen tutar ${money(totals.requestedTotal, 0)}.`,
      };
      setLastSubmit(failure);
      return failure;
    }

    submissionLock.current = true;
    quoteSequence += 1;

    const autoApproved = qualifiesForAutoApproval(totals.marginPct, customer.riskLevel);
    const now = new Date().toISOString();
    const quote: QuoteRequest = {
      id: `q-${quoteSequence}`,
      code: `TK-${quoteSequence}`,
      customerId: customer.id,
      customerName: customer.name,
      contactName: customer.contactName,
      riskLevel: customer.riskLevel,
      status: autoApproved ? 'APPROVED' : 'PENDING',
      createdAt: now,
      paymentTerm,
      note: quoteNote.trim(),
      items: cartItems,
      totalList: round2(totals.listTotal),
      totalRequested: round2(totals.requestedTotal),
      marginPct: Number(totals.marginPct.toFixed(2)),
      autoApproved,
      decidedAt: autoApproved ? now : undefined,
      decisionNote: autoApproved
        ? `Marj eşiği (${MARGIN_THRESHOLD_PCT}%) üzerinde olduğu için otomatik onaylandı.`
        : undefined,
    };

    setQuotes((current) => [quote, ...current]);
    setCart([]);
    setQuoteNote('');

    if (autoApproved) {
      setCredit((current) => {
        const outstanding = current.outstanding + quote.totalRequested;
        return {
          ...current,
          outstanding,
          available: Math.max(current.limit - outstanding - current.overdue, 0),
          utilizationPct: ((outstanding + current.overdue) / current.limit) * 100,
        };
      });
    }

    const success: QuoteSubmitResult = { ok: true, quote, autoApproved };
    setLastSubmit(success);
    submissionLock.current = false;
    return success;
  }, [
    cartItems,
    credit.available,
    creditCheck.exceeds,
    customer,
    paymentTerm,
    quoteNote,
    totals,
  ]);

  const approveQuote = useCallback(
    (quoteId: string, discountPct = 0) => {
      const target = quotes.find((quote) => quote.id === quoteId);
      if (!target) return;

      // İskonto yüzdesi kalem birim fiyatlarına yansıtılır; marj ve toplam yeniden hesaplanır (R7).
      const factor = 1 - discountPct / 100;
      const items = target.items.map((item) => {
        const targetUnitPrice = round2(item.targetUnitPrice * factor);
        return {
          ...item,
          targetUnitPrice,
          requestedTotal: round2(targetUnitPrice * item.quantity),
          marginPct: Number(
            (((targetUnitPrice - item.costUnitPrice) / targetUnitPrice) * 100).toFixed(2),
          ),
        };
      });

      const totalRequested = round2(
        items.reduce((sum, item) => sum + item.requestedTotal, 0),
      );
      const costTotal = items.reduce(
        (sum, item) => sum + item.costUnitPrice * item.quantity,
        0,
      );
      const marginPct = Number((((totalRequested - costTotal) / totalRequested) * 100).toFixed(2));

      setQuotes((current) =>
        current.map((quote) =>
          quote.id === quoteId
            ? {
                ...quote,
                status: 'APPROVED' as const,
                items,
                totalRequested,
                marginPct,
                decidedAt: new Date().toISOString(),
                decisionNote:
                  discountPct > 0
                    ? `Onaylandı • %${discountPct} ek iskonto uygulandı.`
                    : 'Onaylandı.',
              }
            : quote,
        ),
      );

      // Onaylanan teklif müşterinin açık hesabını artırır, kalan limit yeniden hesaplanır (R11).
      if (target.customerId === customer.id) {
        setCredit((current) => {
          const outstanding = current.outstanding + totalRequested;
          return {
            ...current,
            outstanding,
            available: Math.max(current.limit - outstanding - current.overdue, 0),
            utilizationPct: ((outstanding + current.overdue) / current.limit) * 100,
          };
        });
      }
    },
    [quotes, customer.id],
  );

  const rejectQuote = useCallback((quoteId: string, note?: string) => {
    setQuotes((current) =>
      current.map((quote) =>
        quote.id === quoteId
          ? {
              ...quote,
              status: 'REJECTED',
              decidedAt: new Date().toISOString(),
              decisionNote: note?.trim() || 'Talep reddedildi.',
            }
          : quote,
      ),
    );
  }, []);

  const sendCounterOffer = useCallback(
    (quoteId: string, input: CounterOfferInput) => {
      setQuotes((current) =>
        current.map((quote) => {
          if (quote.id !== quoteId) return quote;

          const items = quote.items.map((item) => {
            const targetUnitPrice =
              item.id === quote.items[0]?.id ? round2(input.unitPrice) : item.targetUnitPrice;
            return {
              ...item,
              targetUnitPrice,
              requestedTotal: round2(targetUnitPrice * item.quantity),
              marginPct: Number(
                (((targetUnitPrice - item.costUnitPrice) / targetUnitPrice) * 100).toFixed(2),
              ),
            };
          });

          const totalRequested = round2(
            items.reduce((sum, item) => sum + item.requestedTotal, 0),
          );
          const costTotal = items.reduce(
            (sum, item) => sum + item.costUnitPrice * item.quantity,
            0,
          );

          const counterOffer: CounterOffer = {
            id: `${quote.id}-co-${Date.now()}`,
            quoteId: quote.id,
            itemId: quote.items[0]?.id ?? null,
            proposedUnitPrice: round2(input.unitPrice),
            paymentTerm: input.paymentTerm,
            note: input.note.trim(),
            createdAt: new Date().toISOString(),
            createdBy: 'ADMIN',
          };

          return {
            ...quote,
            status: 'COUNTERED',
            items,
            totalRequested,
            marginPct: Number((((totalRequested - costTotal) / totalRequested) * 100).toFixed(2)),
            paymentTerm: input.paymentTerm,
            counterOffer,
            decidedAt: new Date().toISOString(),
            decisionNote: 'Karşı teklif gönderildi.',
          };
        }),
      );
    },
    [],
  );

  const resetDemo = useCallback(() => {
    setCart([]);
    setQuotes(SEED_QUOTES);
    setPaymentTerm('TERM_30');
    setQuoteNote('');
    setLastSubmit(null);
    setCredit(CUSTOMER.credit);
    setRole('CUSTOMER');
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      role,
      setRole,
      toggleRole,
      customer,
      credit,
      products: PRODUCTS,
      customers,
      cart,
      cartItems,
      totals,
      creditCheck,
      paymentTerm,
      setPaymentTerm,
      quoteNote,
      setQuoteNote,
      addToCart,
      updateQuantity,
      setTargetPrice,
      removeFromCart,
      clearCart,
      isInCart,
      lineFor,
      quotes,
      pendingQuotes,
      lastSubmit,
      submitQuote,
      approveQuote,
      rejectQuote,
      sendCounterOffer,
      resetDemo,
    }),
    [
      role,
      toggleRole,
      customer,
      credit,
      customers,
      cart,
      cartItems,
      totals,
      creditCheck,
      paymentTerm,
      quoteNote,
      addToCart,
      updateQuantity,
      setTargetPrice,
      removeFromCart,
      clearCart,
      isInCart,
      lineFor,
      quotes,
      pendingQuotes,
      lastSubmit,
      submitQuote,
      approveQuote,
      rejectQuote,
      sendCounterOffer,
      resetDemo,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside <AppProvider>.');
  }
  return context;
};
