import type {
  PaymentTerm,
  ProductCategory,
  QuoteStatus,
  RiskLevel,
} from '../types/b2b';

/** Raw hex values for places that cannot use className (StatusBar, icons, charts). */
export const palette = {
  primary: '#536E27',
  primaryDark: '#3F541E',
  accent: '#8FBE1A',
  accentDark: '#7EA717',
  supporting: '#77AA2B',
  dark: '#253213',
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  border: '#E2E8D4',
  text: '#1E293B',
  muted: '#64748B',
  danger: '#DC2626',
  warning: '#D97706',
  success: '#16A34A',
  info: '#2563EB',
  white: '#FFFFFF',
} as const;

interface StatusMeta {
  label: string;
  badgeClass: string;
  textClass: string;
  dotClass: string;
}

/** Presentation metadata for every quote status. */
export const quoteStatusMeta: Record<QuoteStatus, StatusMeta> = {
  PENDING: {
    label: 'Onay Bekliyor',
    badgeClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
  APPROVED: {
    label: 'Onaylandı',
    badgeClass: 'bg-brand-accent/15 border-brand-accent/40',
    textClass: 'text-brand-primary',
    dotClass: 'bg-brand-accent',
  },
  REJECTED: {
    label: 'Reddedildi',
    badgeClass: 'bg-red-50 border-red-200',
    textClass: 'text-red-700',
    dotClass: 'bg-red-500',
  },
  COUNTERED: {
    label: 'Karşı Teklif',
    badgeClass: 'bg-blue-50 border-blue-200',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-500',
  },
};

/** Presentation metadata for customer risk buckets. */
export const riskMeta: Record<RiskLevel, StatusMeta> = {
  LOW: {
    label: 'Düşük Risk',
    badgeClass: 'bg-brand-accent/15 border-brand-accent/40',
    textClass: 'text-brand-primary',
    dotClass: 'bg-brand-accent',
  },
  MEDIUM: {
    label: 'Orta Risk',
    badgeClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
  HIGH: {
    label: 'Yüksek Risk',
    badgeClass: 'bg-red-50 border-red-200',
    textClass: 'text-red-700',
    dotClass: 'bg-red-500',
  },
};

/** Commercial payment terms exposed to customers and admins. */
export const paymentTermMeta: Record<
  PaymentTerm,
  { label: string; shortLabel: string; description: string; discountPct: number }
> = {
  CASH: {
    label: 'Peşin / Nakit',
    shortLabel: 'Peşin',
    description: 'Teslimatta havale veya nakit ödeme.',
    discountPct: 2,
  },
  TERM_30: {
    label: '30 Gün Vadeli',
    shortLabel: '30 Gün',
    description: 'Fatura tarihinden itibaren 30 gün vadeli açık hesap.',
    discountPct: 0,
  },
  CREDIT_CARD: {
    label: 'Kredi Kartı',
    shortLabel: 'Kredi Kartı',
    description: 'Tek çekim kurumsal kredi kartı ile ödeme.',
    discountPct: 0,
  },
};

/** Category filter chips of the catalog. */
export const categoryMeta: Record<ProductCategory, { label: string; icon: string }> = {
  FLOUR: { label: 'Un & Nişasta', icon: 'cube' },
  FAT: { label: 'Yağlar & Margarin', icon: 'water' },
  CHOCOLATE: { label: 'Çikolata & Kakao', icon: 'color-palette' },
  ADDITIVE: { label: 'Katkı & Maya', icon: 'flask' },
  SWEETENER: { label: 'Şeker & Tatlandırıcı', icon: 'sparkles' },
};
