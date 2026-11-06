import type {
  CartLine,
  CreditCheck,
  CustomerCredit,
  PriceTier,
  Product,
  QuoteItem,
  QuoteTotals,
  RiskLevel,
} from '../types/b2b';

/** Margin floor: below this percentage a quote needs manual admin approval. */
export const MARGIN_THRESHOLD_PCT = 10;

/** Tahmini KDV oranı — Türkiye gıda toptan satışında istisnasız %10 uygulanır (R10). */
export const VAT_RATE = 0.1;
export const VAT_RATE_PCT = 10;

/** Returns the tier that applies for the given quantity (highest matching lower bound). */
export const resolveTier = (
  product: Product,
  quantity: number,
): PriceTier | undefined => {
  const eligible = product.priceTiers
    .filter((tier) => quantity >= tier.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity);
  return eligible[0];
};

/** Tier-resolved unit price, falling back to the contract list price. */
export const resolveUnitPrice = (product: Product, quantity: number): number => {
  const tier = resolveTier(product, quantity);
  return tier ? tier.unitPrice : product.basePrice;
};

/** The next volume break the buyer could unlock, if any. */
export const nextTier = (product: Product, quantity: number): PriceTier | undefined => {
  return product.priceTiers
    .filter((tier) => tier.minQuantity > quantity)
    .sort((a, b) => a.minQuantity - b.minQuantity)[0];
};

/** Gross margin percentage for a selling price against an internal cost. */
export const calcMarginPct = (sellingPrice: number, costPrice: number): number => {
  if (sellingPrice <= 0) return 0;
  return ((sellingPrice - costPrice) / sellingPrice) * 100;
};

/** Builds a priced quote line from a cart line. */
export const buildQuoteItem = (product: Product, line: CartLine): QuoteItem => {
  const listUnitPrice = resolveUnitPrice(product, line.quantity);
  const targetUnitPrice =
    typeof line.targetUnitPrice === 'number' && line.targetUnitPrice > 0
      ? line.targetUnitPrice
      : listUnitPrice;

  return {
    id: `${product.id}-${line.quantity}`,
    productId: product.id,
    sku: product.sku,
    name: product.name,
    unit: product.unit,
    quantity: line.quantity,
    listUnitPrice,
    targetUnitPrice,
    costUnitPrice: product.costPrice,
    listTotal: listUnitPrice * line.quantity,
    requestedTotal: targetUnitPrice * line.quantity,
    marginPct: calcMarginPct(targetUnitPrice, product.costPrice),
  };
};

/** Aggregates line items into cart totals. */
export const computeTotals = (items: QuoteItem[]): QuoteTotals => {
  const listTotal = items.reduce((sum, item) => sum + item.listTotal, 0);
  const requestedTotal = items.reduce((sum, item) => sum + item.requestedTotal, 0);
  const unitCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const costTotal = items.reduce(
    (sum, item) => sum + item.costUnitPrice * item.quantity,
    0,
  );

  return {
    itemCount: items.length,
    unitCount,
    listTotal,
    requestedTotal,
    savings: Math.max(listTotal - requestedTotal, 0),
    marginPct: calcMarginPct(requestedTotal, costTotal),
  };
};

/** Credit exposure check performed before a quote can be submitted. */
export const evaluateCredit = (
  credit: CustomerCredit,
  requestedTotal: number,
): CreditCheck => {
  const currentExposure = credit.outstanding + credit.overdue;
  const projectedExposure = currentExposure + requestedTotal;
  const overflow = Math.max(projectedExposure - credit.limit, 0);

  return {
    requestedTotal,
    currentExposure,
    projectedExposure,
    limit: credit.limit,
    available: credit.available,
    exceeds: projectedExposure > credit.limit,
    overflow,
  };
};

/** Credit state used for colour/label decisions in the UI. */
export const creditHealth = (utilizationPct: number): 'HEALTHY' | 'WATCH' | 'CRITICAL' => {
  if (utilizationPct >= 90) return 'CRITICAL';
  if (utilizationPct >= 70) return 'WATCH';
  return 'HEALTHY';
};

/** Auto-approval rule: healthy margin on a non-high-risk account. */
export const qualifiesForAutoApproval = (
  marginPct: number,
  riskLevel: RiskLevel,
): boolean => marginPct >= MARGIN_THRESHOLD_PCT && riskLevel !== 'HIGH';
