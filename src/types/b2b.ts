/**
 * Domain model for the enterprise B2B wholesale & quote management app.
 * Every screen and the shared AppContext are typed against these contracts.
 */

/** Who is using the app right now. Switched at runtime from the header. */
export type UserRole = 'CUSTOMER' | 'ADMIN';

/** Commercial payment terms offered on a quote. */
export type PaymentTerm = 'CASH' | 'TERM_30' | 'CREDIT_CARD';

/** Lifecycle of a quote request, mirrored by the admin approval hub tabs. */
export type QuoteStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COUNTERED';

/** Financial risk bucket derived from payment history. */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/** Catalog grouping used by the category filter chips. */
export type ProductCategory =
  | 'FLOUR'
  | 'FAT'
  | 'CHOCOLATE'
  | 'ADDITIVE'
  | 'SWEETENER';

/** Base unit a product is sold in. */
export type ProductUnit = 'Çuval' | 'Koli' | 'Torba' | 'Kg';

/** Status of an invoice / statement row in the financial ledger. */
export type LedgerEntryStatus = 'PAID' | 'PENDING' | 'OVERDUE';

/** Direction of a ledger movement. */
export type LedgerEntryType = 'INVOICE' | 'COLLECTION' | 'ADJUSTMENT';

/** Volume break for tiered wholesale pricing. */
export interface PriceTier {
  /** Inclusive lower bound of the tier (in product units). */
  minQuantity: number;
  /** Unit price applied when the tier is active. */
  unitPrice: number;
}

/** A sellable wholesale item. */
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: ProductCategory;
  unit: ProductUnit;
  /** Contract list price, used when no volume tier applies. */
  basePrice: number;
  /** Internal landed cost — never shown to customers, used for margin guards. */
  costPrice: number;
  /** Minimum order quantity enforced by the quote engine. */
  moq: number;
  stockQuantity: number;
  priceTiers: PriceTier[];
}

/** One line of the working cart. */
export interface CartLine {
  productId: string;
  quantity: number;
  /** Optional customer target unit price captured before the quote is built. */
  targetUnitPrice?: number;
}

/** A quote line after pricing has been resolved from the catalog. */
export interface QuoteItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  unit: ProductUnit;
  quantity: number;
  /** Tier-resolved list price for the requested quantity. */
  listUnitPrice: number;
  /** Price the customer asks for (defaults to the tier list price). */
  targetUnitPrice: number;
  /** Internal cost per unit, carried for admin margin analysis. */
  costUnitPrice: number;
  listTotal: number;
  requestedTotal: number;
  marginPct: number;
}

/** A customer counter-offer attached to a quote or a single line. */
export interface CounterOffer {
  id: string;
  quoteId: string;
  itemId: string | null;
  proposedUnitPrice: number;
  paymentTerm: PaymentTerm;
  note: string;
  createdAt: string;
  createdBy: UserRole;
}

/** A submitted quote request travelling through the approval workflow. */
export interface QuoteRequest {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  contactName: string;
  riskLevel: RiskLevel;
  status: QuoteStatus;
  createdAt: string;
  paymentTerm: PaymentTerm;
  note: string;
  items: QuoteItem[];
  totalList: number;
  totalRequested: number;
  /** Blended margin across all lines, in percent. */
  marginPct: number;
  /** True when the quote was approved automatically by the margin rule. */
  autoApproved: boolean;
  counterOffer?: CounterOffer;
  decidedAt?: string;
  decisionNote?: string;
}

/** Credit exposure of a corporate customer. */
export interface CustomerCredit {
  /** Agreed risk limit in TRY. */
  limit: number;
  /** Invoiced but not yet collected balance. */
  outstanding: number;
  /** Outstanding amount past its due date. */
  overdue: number;
  /** limit - outstanding - overdue, floored at zero. */
  available: number;
  /** Share of the limit already consumed, 0-100. */
  utilizationPct: number;
  riskScore: string;
}

/** Result of evaluating a new quote against the credit limit. */
export interface CreditCheck {
  requestedTotal: number;
  currentExposure: number;
  projectedExposure: number;
  limit: number;
  available: number;
  exceeds: boolean;
  overflow: number;
}

/** The signed-in corporate customer. */
export interface Customer {
  id: string;
  name: string;
  code: string;
  taxNumber: string;
  city: string;
  contactName: string;
  phone: string;
  email: string;
  riskLevel: RiskLevel;
  credit: CustomerCredit;
}

/** Invoice / collection row rendered by the ledger screen. */
export interface LedgerEntry {
  id: string;
  reference: string;
  description: string;
  date: string;
  amount: number;
  type: LedgerEntryType;
  status: LedgerEntryStatus;
}

/** Aggregated cart totals and margin, memoised by the context. */
export interface QuoteTotals {
  itemCount: number;
  unitCount: number;
  listTotal: number;
  requestedTotal: number;
  savings: number;
  marginPct: number;
}

/** Outcome returned by quote submission so the UI can render inline errors. */
export type QuoteSubmitResult =
  | { ok: true; quote: QuoteRequest; autoApproved: boolean }
  | { ok: false; reason: 'EMPTY_CART' | 'MOQ' | 'CREDIT_LIMIT'; message: string };
