import type {
  CreditCheck,
  CustomerCredit,
  LedgerEntry,
  PaymentTerm,
  Product,
  QuoteRequest,
  QuoteStatus,
} from '../types/b2b';
import { CUSTOMER, LEDGER_ENTRIES, PRODUCTS, SEED_QUOTES } from '../data/mockData';
import {
  buildQuoteItem,
  computeTotals,
  evaluateCredit,
  qualifiesForAutoApproval,
} from '../utils/pricing';
import { supabase } from './client';

/** Teklif oluşturma girdisi (§9 POST /quotes). */
export interface CreateQuoteItemInput {
  productId: string;
  quantity: number;
  targetUnitPrice?: number;
}

export interface CreateQuoteInput {
  items: CreateQuoteItemInput[];
  paymentTerm: PaymentTerm;
  note: string;
  idempotencyKey: string;
}

export type ApiErrorCode = 'EMPTY_CART' | 'MOQ_VIOLATION' | 'CREDIT_LIMIT';

/** §9 422 dönüşünü modelleyen hata tipi. */
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly overflow?: number,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

/** Backend hazır olduğunda bağlanacak servis sözleşmesi (§9). */
export interface B2bApi {
  getProducts(params?: { category?: string; search?: string }): Promise<Product[]>;
  createQuote(input: CreateQuoteInput): Promise<{ quote: QuoteRequest; autoApproved: boolean }>;
  getQuotes(params?: { status?: QuoteStatus }): Promise<QuoteRequest[]>;
  approveQuote(quoteId: string, discountPct?: number): Promise<QuoteRequest>;
  rejectQuote(quoteId: string, note?: string): Promise<QuoteRequest>;
  counterQuote(
    quoteId: string,
    input: { unitPrice: number; paymentTerm: PaymentTerm; note: string },
  ): Promise<QuoteRequest>;
  getCredit(): Promise<{ credit: CustomerCredit; check: CreditCheck }>;
  getLedger(params?: { from?: string; to?: string }): Promise<LedgerEntry[]>;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/* ------------------------------------------------------------------ mock */

const mockQuotes: QuoteRequest[] = [...SEED_QUOTES];
let mockSequence = 2060;

/** Çevrimdışı demo: aynı iş kurallarını istemcide çalıştıran sunucu simülasyonu. */
const mockB2bApi: B2bApi = {
  async getProducts(params) {
    const category = params?.category;
    const search = params?.search?.trim().toLowerCase();
    return PRODUCTS.filter((product) => {
      const matchCategory = !category || product.category === category;
      const matchSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search) ||
        product.description.toLowerCase().includes(search);
      return matchCategory && matchSearch;
    });
  },

  async createQuote(input) {
    if (input.items.length === 0) throw new ApiError('EMPTY_CART');

    const items = input.items.map((line) => {
      const product = PRODUCTS.find((p) => p.id === line.productId);
      if (!product) throw new Error(`Bilinmeyen ürün: ${line.productId}`);
      if (line.quantity < product.moq) throw new ApiError('MOQ_VIOLATION');
      return buildQuoteItem(product, {
        productId: line.productId,
        quantity: line.quantity,
        targetUnitPrice: line.targetUnitPrice,
      });
    });

    const totals = computeTotals(items);
    const check = evaluateCredit(CUSTOMER.credit, totals.requestedTotal);
    if (check.exceeds) throw new ApiError('CREDIT_LIMIT', check.overflow);

    const autoApproved = qualifiesForAutoApproval(totals.marginPct, CUSTOMER.riskLevel);
    mockSequence += 1;
    const now = new Date().toISOString();
    const quote: QuoteRequest = {
      id: `q-${mockSequence}`,
      code: `TK-${mockSequence}`,
      customerId: CUSTOMER.id,
      customerName: CUSTOMER.name,
      contactName: CUSTOMER.contactName,
      riskLevel: CUSTOMER.riskLevel,
      status: autoApproved ? 'APPROVED' : 'PENDING',
      createdAt: now,
      paymentTerm: input.paymentTerm,
      note: input.note,
      items,
      totalList: round2(totals.listTotal),
      totalRequested: round2(totals.requestedTotal),
      marginPct: Number(totals.marginPct.toFixed(2)),
      autoApproved,
      decidedAt: autoApproved ? now : undefined,
      decisionNote: autoApproved ? 'Marj eşiği üzerinde — otomatik onaylandı.' : undefined,
    };
    mockQuotes.unshift(quote);
    return { quote, autoApproved };
  },

  async getQuotes(params) {
    return params?.status
      ? mockQuotes.filter((quote) => quote.status === params.status)
      : [...mockQuotes];
  },

  async approveQuote(quoteId, discountPct = 0) {
    const target = mockQuotes.find((quote) => quote.id === quoteId);
    if (!target) throw new Error('Teklif bulunamadı.');

    const factor = 1 - discountPct / 100;
    const items = target.items.map((item) => {
      const targetUnitPrice = round2(item.targetUnitPrice * factor);
      return {
        ...item,
        targetUnitPrice,
        requestedTotal: round2(targetUnitPrice * item.quantity),
        marginPct: Number((((targetUnitPrice - item.costUnitPrice) / targetUnitPrice) * 100).toFixed(2)),
      };
    });
    const totalRequested = round2(items.reduce((sum, item) => sum + item.requestedTotal, 0));
    const costTotal = items.reduce((sum, item) => sum + item.costUnitPrice * item.quantity, 0);

    const updated: QuoteRequest = {
      ...target,
      status: 'APPROVED',
      items,
      totalRequested,
      marginPct: Number((((totalRequested - costTotal) / totalRequested) * 100).toFixed(2)),
      decidedAt: new Date().toISOString(),
      decisionNote: discountPct > 0 ? `Onaylandı • %${discountPct} iskonto.` : 'Onaylandı.',
    };
    mockQuotes.splice(mockQuotes.indexOf(target), 1, updated);
    return updated;
  },

  async rejectQuote(quoteId, note) {
    const target = mockQuotes.find((quote) => quote.id === quoteId);
    if (!target) throw new Error('Teklif bulunamadı.');
    const updated: QuoteRequest = {
      ...target,
      status: 'REJECTED',
      decidedAt: new Date().toISOString(),
      decisionNote: note?.trim() || 'Talep reddedildi.',
    };
    mockQuotes.splice(mockQuotes.indexOf(target), 1, updated);
    return updated;
  },

  async counterQuote(quoteId, input) {
    const target = mockQuotes.find((quote) => quote.id === quoteId);
    if (!target) throw new Error('Teklif bulunamadı.');
    const firstId = target.items[0]?.id ?? null;

    const items = target.items.map((item) => {
      const targetUnitPrice = item.id === firstId ? round2(input.unitPrice) : item.targetUnitPrice;
      return {
        ...item,
        targetUnitPrice,
        requestedTotal: round2(targetUnitPrice * item.quantity),
        marginPct: Number((((targetUnitPrice - item.costUnitPrice) / targetUnitPrice) * 100).toFixed(2)),
      };
    });
    const totalRequested = round2(items.reduce((sum, item) => sum + item.requestedTotal, 0));
    const costTotal = items.reduce((sum, item) => sum + item.costUnitPrice * item.quantity, 0);

    const updated: QuoteRequest = {
      ...target,
      status: 'COUNTERED',
      paymentTerm: input.paymentTerm,
      items,
      totalRequested,
      marginPct: Number((((totalRequested - costTotal) / totalRequested) * 100).toFixed(2)),
      counterOffer: {
        id: `${quoteId}-co-${Date.now()}`,
        quoteId,
        itemId: firstId,
        proposedUnitPrice: round2(input.unitPrice),
        paymentTerm: input.paymentTerm,
        note: input.note.trim(),
        createdAt: new Date().toISOString(),
        createdBy: 'ADMIN',
      },
      decidedAt: new Date().toISOString(),
      decisionNote: 'Karşı teklif gönderildi.',
    };
    mockQuotes.splice(mockQuotes.indexOf(target), 1, updated);
    return updated;
  },

  async getCredit() {
    return { credit: CUSTOMER.credit, check: evaluateCredit(CUSTOMER.credit, 0) };
  },

  async getLedger(params) {
    const from = params?.from ? new Date(params.from).getTime() : -Infinity;
    const to = params?.to ? new Date(params.to).getTime() : Infinity;
    return LEDGER_ENTRIES.filter((entry) => {
      const time = new Date(entry.date).getTime();
      return time >= from && time <= to;
    });
  },
};

/* -------------------------------------------------------------- supabase */

const requireDb = (): NonNullable<typeof supabase> => {
  if (!supabase) throw new Error('Supabase yapılandırılmadı.');
  return supabase;
};

/** Postgres hata mesajını §9 hata kodlarına çevirir. */
const mapPgError = (error: { message?: string } | null): Error => {
  const message = error?.message ?? 'Bilinmeyen sunucu hatası.';
  if (message.includes('EMPTY_CART')) return new ApiError('EMPTY_CART');
  if (message.includes('MOQ_VIOLATION')) return new ApiError('MOQ_VIOLATION');
  if (message.includes('CREDIT_LIMIT')) return new ApiError('CREDIT_LIMIT');
  return new Error(message);
};

/**
 * Gerçek Supabase implementasyonu. Para ve marj, §9 gereği sunucuda (RPC/trigger)
 * yeniden hesaplanır; istemci yalnızca sonucu gösterir.
 */
const supabaseB2bApi: B2bApi = {
  async getProducts(params) {
    const db = requireDb();
    let query = db.from('products').select('*');
    if (params?.category) query = query.eq('category', params.category);
    if (params?.search) {
      const term = `%${params.search}%`;
      query = query.or(`name.ilike.${term},sku.ilike.${term}`);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as Product[];
  },

  async createQuote(input) {
    const db = requireDb();
    const { data, error } = await db.rpc('create_quote', { payload: input });
    if (error) throw mapPgError(error);
    return data as { quote: QuoteRequest; autoApproved: boolean };
  },

  async getQuotes(params) {
    const db = requireDb();
    let query = db.from('quotes').select('*').order('created_at', { ascending: false });
    if (params?.status) query = query.eq('status', params.status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as QuoteRequest[];
  },

  async approveQuote(quoteId, discountPct = 0) {
    const db = requireDb();
    const { data, error } = await db.rpc('approve_quote', {
      p_quote_id: quoteId,
      p_discount_pct: discountPct,
    });
    if (error) throw mapPgError(error);
    return data as QuoteRequest;
  },

  async rejectQuote(quoteId, note) {
    const db = requireDb();
    const { data, error } = await db.rpc('reject_quote', {
      p_quote_id: quoteId,
      p_note: note ?? '',
    });
    if (error) throw mapPgError(error);
    return data as QuoteRequest;
  },

  async counterQuote(quoteId, input) {
    const db = requireDb();
    const { data, error } = await db.rpc('counter_quote', {
      p_quote_id: quoteId,
      p_input: input,
    });
    if (error) throw mapPgError(error);
    return data as QuoteRequest;
  },

  async getCredit() {
    const db = requireDb();
    const { data, error } = await db.rpc('get_credit');
    if (error) throw new Error(error.message);
    return data as { credit: CustomerCredit; check: CreditCheck };
  },

  async getLedger(params) {
    const db = requireDb();
    let query = db.from('ledger').select('*').order('date', { ascending: false });
    if (params?.from) query = query.gte('date', params.from);
    if (params?.to) query = query.lte('date', params.to);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as LedgerEntry[];
  },
};

/** Aktif API: Supabase yapılandırıldıysa gerçek istemci, aksi halde mock. */
export const getB2bApi = (): B2bApi => (supabase ? supabaseB2bApi : mockB2bApi);
