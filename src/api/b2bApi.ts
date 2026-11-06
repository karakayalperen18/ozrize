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
    input: { itemId?: string; unitPrice: number; paymentTerm: PaymentTerm; note: string },
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
    const targetItemId = input.itemId ?? target.items[0]?.id ?? null;

    const items = target.items.map((item) => {
      const isTarget = item.id === targetItemId || item.productId === targetItemId;
      const targetUnitPrice = isTarget ? round2(input.unitPrice) : item.targetUnitPrice;
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
        itemId: targetItemId,
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

const mapProduct = (row: any): Product => ({
  id: row.id,
  sku: row.sku,
  name: row.name,
  description: row.description ?? '',
  category: row.category,
  unit: row.unit,
  basePrice: Number(row.base_price ?? 0),
  costPrice: Number(row.cost_price ?? 0),
  moq: Number(row.moq ?? 1),
  stockQuantity: Number(row.stock_qty ?? 0),
  priceTiers: (row.price_tiers ?? []).map((t: any) => ({
    minQuantity: Number(t.minQuantity ?? t.min_quantity ?? 0),
    unitPrice: Number(t.unitPrice ?? t.unit_price ?? 0),
  })),
});

const mapQuote = (row: any): QuoteRequest => ({
  id: row.id,
  code: row.code,
  customerId: row.customer_id,
  customerName: row.customer_name,
  contactName: row.contact_name ?? '',
  riskLevel: row.risk_level,
  status: row.status,
  createdAt: row.created_at,
  paymentTerm: row.payment_term,
  note: row.note ?? '',
  items: (row.items ?? []).map((item: any) => ({
    id: item.id,
    productId: item.productId,
    sku: item.sku,
    name: item.name,
    unit: item.unit,
    quantity: Number(item.quantity ?? 0),
    listUnitPrice: Number(item.listUnitPrice ?? 0),
    targetUnitPrice: Number(item.targetUnitPrice ?? 0),
    costUnitPrice: Number(item.costUnitPrice ?? 0),
    listTotal: Number(item.listTotal ?? 0),
    requestedTotal: Number(item.requestedTotal ?? 0),
    marginPct: Number(item.marginPct ?? 0),
  })),
  totalList: Number(row.total_list ?? 0),
  totalRequested: Number(row.total_requested ?? 0),
  marginPct: Number(row.margin_pct ?? 0),
  autoApproved: Boolean(row.auto_approved),
  counterOffer: row.counter_offer ?? undefined,
  decidedAt: row.decided_at ?? undefined,
  decisionNote: row.decision_note ?? undefined,
});

const mapCredit = (raw: any): CustomerCredit => ({
  limit: Number(raw.credit_limit ?? raw.limit ?? 0),
  outstanding: Number(raw.outstanding ?? 0),
  overdue: Number(raw.overdue ?? 0),
  available: Number(raw.available ?? 0),
  utilizationPct: Number(raw.utilization_pct ?? raw.utilizationPct ?? 0),
  riskScore: String(raw.risk_score ?? raw.riskScore ?? 'B'),
});

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
      const sanitized = params.search.replace(/[%_,]/g, '');
      query = query.or(`name.ilike.%${sanitized}%,sku.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapProduct);
  },

  async createQuote(input) {
    const db = requireDb();
    const { data, error } = await db.rpc('create_quote', { payload: input });
    if (error) throw mapPgError(error);
    return {
      quote: mapQuote(data.quote),
      autoApproved: Boolean(data.autoApproved),
    };
  },

  async getQuotes(params) {
    const db = requireDb();
    let query = db.from('quotes').select('*').order('created_at', { ascending: false });
    if (params?.status) query = query.eq('status', params.status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapQuote);
  },

  async approveQuote(quoteId, discountPct = 0) {
    const db = requireDb();
    const { data, error } = await db.rpc('approve_quote', {
      p_quote_id: quoteId,
      p_discount_pct: discountPct,
    });
    if (error) throw mapPgError(error);
    return mapQuote(data);
  },

  async rejectQuote(quoteId, note) {
    const db = requireDb();
    const { data, error } = await db.rpc('reject_quote', {
      p_quote_id: quoteId,
      p_note: note ?? '',
    });
    if (error) throw mapPgError(error);
    return mapQuote(data);
  },

  async counterQuote(quoteId, input) {
    const db = requireDb();
    const { data, error } = await db.rpc('counter_quote', {
      p_quote_id: quoteId,
      p_input: input,
    });
    if (error) throw mapPgError(error);
    return mapQuote(data);
  },

  async getCredit() {
    const db = requireDb();
    const { data, error } = await db.rpc('get_credit');
    if (error) throw new Error(error.message);
    return {
      credit: mapCredit(data.credit),
      check: {
        requestedTotal: Number(data.check?.requestedTotal ?? 0),
        currentExposure: Number(data.check?.currentExposure ?? 0),
        projectedExposure: Number(data.check?.projectedExposure ?? 0),
        limit: Number(data.check?.limit ?? 0),
        available: Number(data.check?.available ?? 0),
        exceeds: Boolean(data.check?.exceeds),
        overflow: Number(data.check?.overflow ?? 0),
      },
    };
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
