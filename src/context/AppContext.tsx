import * as Crypto from 'expo-crypto';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getB2bApi } from '../api/b2bApi';
import { supabase } from '../api/client';
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
  buildQuoteItem,
  computeTotals,
  evaluateCredit,
} from '../utils/pricing';
import { useAuth } from './AuthContext';

interface CounterOfferInput {
  itemId?: string;
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
  loading: boolean;

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
  submitQuote: () => Promise<QuoteSubmitResult>;
  approveQuote: (quoteId: string, discountPct?: number) => Promise<void>;
  rejectQuote: (quoteId: string, note?: string) => Promise<void>;
  sendCounterOffer: (quoteId: string, input: CounterOfferInput) => Promise<void>;
  resetDemo: () => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Profil tablosundan gerçek rolü çekme (Admin e-postası ise anında ADMIN başlat)
  const [profileRole, setProfileRole] = useState<UserRole | null>(() => {
    if (user?.email?.toLowerCase().includes('admin')) return 'ADMIN';
    return null;
  });

  const jwtRole = (user?.app_metadata?.user_role ?? user?.user_metadata?.user_role) as UserRole | undefined;

  useEffect(() => {
    if (!user || !supabase) {
      setProfileRole(null);
      return;
    }

    if (user.email?.toLowerCase().includes('admin')) {
      setProfileRole('ADMIN');
    }

    supabase
      .from('customer_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.role) {
          setProfileRole(data.role as UserRole);
        }
      });
  }, [user?.id, user?.email]);

  const role: UserRole = useMemo(() => {
    if (profileRole) return profileRole;
    if (jwtRole) return jwtRole;
    if (user?.email?.toLowerCase().includes('admin')) return 'ADMIN';
    return 'CUSTOMER';
  }, [profileRole, jwtRole, user?.email]);

  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [quotes, setQuotes] = useState<QuoteRequest[]>(SEED_QUOTES);
  const [credit, setCredit] = useState<CustomerCredit>(CUSTOMER.credit);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>('TERM_30');
  const [quoteNote, setQuoteNote] = useState('');
  const [lastSubmit, setLastSubmit] = useState<QuoteSubmitResult | null>(null);
  const submissionLock = useRef(false);

  const customer = useMemo<Customer>(() => {
    if (user) {
      return {
        ...CUSTOMER,
        id: user.id,
        name: (user.user_metadata?.company_name as string) ?? CUSTOMER.name,
        contactName: (user.user_metadata?.contact_name as string) ?? user.email ?? CUSTOMER.contactName,
        email: user.email ?? CUSTOMER.email,
        credit,
      };
    }
    return { ...CUSTOMER, credit };
  }, [user, credit]);

  const customers = useMemo<Customer[]>(
    () => CUSTOMERS.map((item) => (item.id === customer.id ? { ...item, credit } : item)),
    [credit, customer.id],
  );

  const toggleRole = useCallback(() => {
    // Oturum açılmışken kullanıcı rolünü değiştiremez; rol veritabanından belirlenir.
  }, []);

  const setRole = useCallback((_newRole: UserRole) => {
    // Oturum açılmışken kullanıcı rolünü değiştiremez.
  }, []);

  // API'den canlı verileri çekme (bağımsız bloklar: bir hata diğerini engellemez)
  const refreshData = useCallback(async () => {
    const api = getB2bApi();

    try {
      const prods = await api.getProducts();
      if (prods && prods.length > 0) setProducts(prods);
    } catch (e: any) {
      console.warn('Ürünler çekilemedi:', e?.message);
    }

    try {
      const quots = await api.getQuotes();
      if (quots) setQuotes(quots);
    } catch (e: any) {
      console.warn('Teklifler çekilemedi:', e?.message);
    }

    try {
      const creditData = await api.getCredit();
      if (creditData?.credit) setCredit(creditData.credit);
    } catch (e: any) {
      console.warn('Kredi bilgisi çekilemedi:', e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData, user?.id]);

  // Realtime Abonelik (Aşama 6.2)
  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;

    const channel = client
      .channel('quotes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: role === 'CUSTOMER' ? `customer_id=eq.${user.id}` : undefined,
        },
        () => {
          refreshData();
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user?.id, role, refreshData]);

  /* ------------------------------------------------------------------ cart */

  const addToCart = useCallback((productId: string, quantity?: number) => {
    const product = products.find((p) => p.id === productId) ?? productById(productId);
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
  }, [products]);

  const setLineQuantity = useCallback((productId: string, quantity: number) => {
    const product = products.find((p) => p.id === productId) ?? productById(productId);
    if (!product) return;

    const clamped = Math.min(Math.max(quantity, product.moq), product.stockQuantity);
    setCart((current) =>
      current.map((line) =>
        line.productId === productId ? { ...line, quantity: clamped } : line,
      ),
    );
  }, [products]);

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
        const product = products.find((p) => p.id === line.productId) ?? productById(line.productId);
        if (!product) return undefined;
        return buildQuoteItem(product, line);
      })
      .filter((item): item is QuoteItem => Boolean(item));
  }, [cart, products]);

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

  const submitQuote = useCallback(async (): Promise<QuoteSubmitResult> => {
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

    submissionLock.current = true;
    try {
      const idempotencyKey = Crypto.randomUUID();
      const api = getB2bApi();
      const { quote, autoApproved } = await api.createQuote({
        items: cartItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          targetUnitPrice: i.targetUnitPrice,
        })),
        paymentTerm,
        note: quoteNote.trim(),
        idempotencyKey,
      });

      setQuotes((prev) => [quote, ...prev.filter((q) => q.id !== quote.id)]);
      clearCart();
      await refreshData();

      const success: QuoteSubmitResult = { ok: true, quote, autoApproved };
      setLastSubmit(success);
      return success;
    } catch (err: any) {
      const msg = err.message ?? '';
      let failure: QuoteSubmitResult;

      if (msg.includes('CREDIT_LIMIT')) {
        failure = { ok: false, reason: 'CREDIT_LIMIT', message: msg };
      } else if (msg.includes('MOQ_VIOLATION') || msg.includes('MOQ')) {
        failure = { ok: false, reason: 'MOQ', message: msg };
      } else {
        failure = { ok: false, reason: 'EMPTY_CART', message: msg || 'Teklif oluşturulamadı.' };
      }

      setLastSubmit(failure);
      return failure;
    } finally {
      submissionLock.current = false;
    }
  }, [cartItems, clearCart, paymentTerm, quoteNote, refreshData]);

  const approveQuote = useCallback(
    async (quoteId: string, discountPct = 0) => {
      const api = getB2bApi();
      const updated = await api.approveQuote(quoteId, discountPct);
      setQuotes((current) => current.map((q) => (q.id === quoteId ? updated : q)));
      await refreshData();
    },
    [refreshData],
  );

  const rejectQuote = useCallback(
    async (quoteId: string, note?: string) => {
      const api = getB2bApi();
      const updated = await api.rejectQuote(quoteId, note);
      setQuotes((current) => current.map((q) => (q.id === quoteId ? updated : q)));
      await refreshData();
    },
    [refreshData],
  );

  const sendCounterOffer = useCallback(
    async (quoteId: string, input: CounterOfferInput) => {
      const api = getB2bApi();
      const updated = await api.counterQuote(quoteId, input);
      setQuotes((current) => current.map((q) => (q.id === quoteId ? updated : q)));
      await refreshData();
    },
    [refreshData],
  );

  const resetDemo = useCallback(() => {
    setCart([]);
    setQuotes(SEED_QUOTES);
    setPaymentTerm('TERM_30');
    setQuoteNote('');
    setLastSubmit(null);
    setCredit(CUSTOMER.credit);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      role,
      setRole,
      toggleRole,
      customer,
      credit,
      products,
      customers,
      loading,
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
      refreshData,
    }),
    [
      role,
      setRole,
      toggleRole,
      customer,
      credit,
      products,
      customers,
      loading,
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
      refreshData,
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
