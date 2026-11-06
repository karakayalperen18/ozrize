import type {
  Customer,
  LedgerEntry,
  PaymentTerm,
  Product,
  QuoteItem,
  QuoteRequest,
  QuoteStatus,
  RiskLevel,
} from '../types/b2b';
import { buildQuoteItem, calcMarginPct, computeTotals } from '../utils/pricing';

/** Signed-in corporate buyer used by the customer portal. */
export const CUSTOMER: Customer = {
  id: 'cust-4910',
  name: 'Lezzet Pastaneleri A.Ş.',
  code: 'TR-4910',
  taxNumber: '3880491029',
  city: 'İstanbul',
  contactName: 'Ayşe Yıldız',
  phone: '+90 532 000 00 00',
  email: 'satinalma@lezzetpastane.com',
  riskLevel: 'LOW',
  credit: {
    limit: 500000,
    outstanding: 340000,
    overdue: 18500,
    available: 500000 - 340000 - 18500,
    utilizationPct: ((340000 + 18500) / 500000) * 100,
    riskScore: 'A',
  },
};

/** Credit profile builder — keeps available/utilization consistent in one place (R12). */
const makeCredit = (
  limit: number,
  outstanding: number,
  overdue: number,
  riskScore: string,
): Customer['credit'] => ({
  limit,
  outstanding,
  overdue,
  available: Math.max(limit - outstanding - overdue, 0),
  utilizationPct: ((outstanding + overdue) / limit) * 100,
  riskScore,
});

/** All corporate customers — the sales team portfolio (admin sees every company). */
export const CUSTOMERS: Customer[] = [
  CUSTOMER,
  {
    id: 'cust-has',
    name: 'Has Unlu Mamulleri Ltd. Şti.',
    code: 'TR-2201',
    taxNumber: '7120458091',
    city: 'İstanbul',
    contactName: 'Mehmet Kaya',
    phone: '+90 533 210 44 10',
    email: 'satinalma@hasunlu.com',
    riskLevel: 'MEDIUM',
    credit: makeCredit(250000, 180000, 22000, 'B'),
  },
  {
    id: 'cust-anadolu',
    name: 'Anadolu Pastane Grubu',
    code: 'TR-3385',
    taxNumber: '9012456678',
    city: 'Ankara',
    contactName: 'Selin Arı',
    phone: '+90 534 611 22 30',
    email: 'operasyon@anadolupastane.com',
    riskLevel: 'LOW',
    credit: makeCredit(400000, 210000, 0, 'A'),
  },
  {
    id: 'cust-ege',
    name: 'Ege Fırıncılık A.Ş.',
    code: 'TR-5620',
    taxNumber: '4550127398',
    city: 'İzmir',
    contactName: 'Barış Demir',
    phone: '+90 535 822 71 90',
    email: 'muhasebe@egefirin.com',
    riskLevel: 'HIGH',
    credit: makeCredit(150000, 128000, 41000, 'C'),
  },
  {
    id: 'cust-marmara',
    name: 'Marmara Un Sanayi',
    code: 'TR-7049',
    taxNumber: '3088729112',
    city: 'Bursa',
    contactName: 'Cem Öztürk',
    phone: '+90 536 402 18 55',
    email: 'ticaret@marmaraun.com',
    riskLevel: 'LOW',
    credit: makeCredit(300000, 96000, 0, 'A'),
  },
];

export const customerById = (id: string): Customer | undefined =>
  CUSTOMERS.find((customer) => customer.id === id);

/** Wholesale catalog with volume tiers and internal costs. */
export const PRODUCTS: Product[] = [
  {
    id: 'p-un-992',
    sku: 'SKU-992',
    name: 'Baklava & Böreklik Un 25 KG',
    description: 'Özel ipek tip 550 • çuval ambalaj',
    category: 'FLOUR',
    unit: 'Çuval',
    basePrice: 450,
    costPrice: 385,
    moq: 10,
    stockQuantity: 1840,
    priceTiers: [
      { minQuantity: 10, unitPrice: 450 },
      { minQuantity: 50, unitPrice: 438 },
      { minQuantity: 100, unitPrice: 425 },
    ],
  },
  {
    id: 'p-yag-418',
    sku: 'SKU-418',
    name: 'Pastacılık Kruvasan Margarini 10 KG',
    description: 'Yüksek elastikiyet, laminasyon blok yağ',
    category: 'FAT',
    unit: 'Koli',
    basePrice: 1250,
    costPrice: 1050,
    moq: 5,
    stockQuantity: 620,
    priceTiers: [
      { minQuantity: 5, unitPrice: 1250 },
      { minQuantity: 25, unitPrice: 1215 },
      { minQuantity: 50, unitPrice: 1180 },
    ],
  },
  {
    id: 'p-kakao-771',
    sku: 'SKU-771',
    name: 'Alkalize Kakao Tozu %20-22 • 20 KG',
    description: 'Koyu renk, yoğun aroma • pastacılık kakao',
    category: 'CHOCOLATE',
    unit: 'Torba',
    basePrice: 2800,
    costPrice: 2380,
    moq: 2,
    stockQuantity: 240,
    priceTiers: [
      { minQuantity: 2, unitPrice: 2800 },
      { minQuantity: 10, unitPrice: 2720 },
      { minQuantity: 25, unitPrice: 2650 },
    ],
  },
  {
    id: 'p-un-120',
    sku: 'SKU-120',
    name: 'Ekmeklik Tam Buğday Unu 50 KG',
    description: 'Taş değirmen • yüksek lif oranı',
    category: 'FLOUR',
    unit: 'Çuval',
    basePrice: 690,
    costPrice: 600,
    moq: 5,
    stockQuantity: 960,
    priceTiers: [
      { minQuantity: 5, unitPrice: 690 },
      { minQuantity: 30, unitPrice: 672 },
      { minQuantity: 60, unitPrice: 655 },
    ],
  },
  {
    id: 'p-yag-233',
    sku: 'SKU-233',
    name: 'Sütlü Tereyağı 5 KG',
    description: 'Geleneksel yayık tereyağı • soğuk zincir',
    category: 'FAT',
    unit: 'Koli',
    basePrice: 2400,
    costPrice: 2100,
    moq: 4,
    stockQuantity: 310,
    priceTiers: [
      { minQuantity: 4, unitPrice: 2400 },
      { minQuantity: 20, unitPrice: 2330 },
      { minQuantity: 40, unitPrice: 2265 },
    ],
  },
  {
    id: 'p-maya-305',
    sku: 'SKU-305',
    name: 'Instant Kuru Maya 500 G',
    description: 'Yüksek aktiviteli • 20’li koli',
    category: 'ADDITIVE',
    unit: 'Koli',
    basePrice: 380,
    costPrice: 330,
    moq: 12,
    stockQuantity: 1450,
    priceTiers: [
      { minQuantity: 12, unitPrice: 380 },
      { minQuantity: 48, unitPrice: 365 },
      { minQuantity: 96, unitPrice: 352 },
    ],
  },
  {
    id: 'p-seker-512',
    sku: 'SKU-512',
    name: 'Pudra Şekeri 25 KG',
    description: '0 numara öğütülmüş • topaklanma önleyici',
    category: 'SWEETENER',
    unit: 'Çuval',
    basePrice: 980,
    costPrice: 860,
    moq: 6,
    stockQuantity: 740,
    priceTiers: [
      { minQuantity: 6, unitPrice: 980 },
      { minQuantity: 24, unitPrice: 952 },
      { minQuantity: 48, unitPrice: 930 },
    ],
  },
  {
    id: 'p-cikolata-604',
    sku: 'SKU-604',
    name: 'Sütlü Kuvertür Çikolata 1 KG',
    description: '%34 kakao • damla ve blok seçenekli',
    category: 'CHOCOLATE',
    unit: 'Koli',
    basePrice: 1450,
    costPrice: 1200,
    moq: 10,
    stockQuantity: 520,
    priceTiers: [
      { minQuantity: 10, unitPrice: 1450 },
      { minQuantity: 40, unitPrice: 1405 },
      { minQuantity: 80, unitPrice: 1368 },
    ],
  },
  {
    id: 'p-krema-707',
    sku: 'SKU-707',
    name: 'Pasta Kreması Şanti 1 KG',
    description: 'Uzun ömürlü • bitkisel yağ bazlı',
    category: 'ADDITIVE',
    unit: 'Koli',
    basePrice: 720,
    costPrice: 615,
    moq: 6,
    stockQuantity: 880,
    priceTiers: [
      { minQuantity: 6, unitPrice: 720 },
      { minQuantity: 24, unitPrice: 699 },
      { minQuantity: 60, unitPrice: 678 },
    ],
  },
  {
    id: 'p-glutensiz-815',
    sku: 'SKU-815',
    name: 'Glutensiz Pirinç Unu 10 KG',
    description: 'Sertifikalı glutensiz hat • torba',
    category: 'FLOUR',
    unit: 'Torba',
    basePrice: 560,
    costPrice: 495,
    moq: 8,
    stockQuantity: 260,
    priceTiers: [
      { minQuantity: 8, unitPrice: 560 },
      { minQuantity: 32, unitPrice: 542 },
      { minQuantity: 64, unitPrice: 525 },
    ],
  },
];

export const productById = (id: string): Product | undefined =>
  PRODUCTS.find((product) => product.id === id);

const now = Date.now();
const isoDaysAgo = (days: number, hours = 3): string =>
  new Date(now - days * 86400000 - hours * 3600000).toISOString();

interface SeedLine {
  productId: string;
  quantity: number;
  targetUnitPrice?: number;
}

interface SeedQuote {
  id: string;
  code: string;
  customerName: string;
  contactName: string;
  riskLevel: RiskLevel;
  status: QuoteStatus;
  daysAgo: number;
  paymentTerm: PaymentTerm;
  note: string;
  lines: SeedLine[];
  counterUnitPrice?: number;
  counterNote?: string;
  decisionNote?: string;
}

const buildSeedItems = (lines: SeedLine[]): QuoteItem[] =>
  lines
    .map((line) => {
      const product = productById(line.productId);
      if (!product) return undefined;
      return buildQuoteItem(product, {
        productId: line.productId,
        quantity: line.quantity,
        targetUnitPrice: line.targetUnitPrice,
      });
    })
    .filter((item): item is QuoteItem => Boolean(item));

const buildSeedQuote = (seed: SeedQuote): QuoteRequest => {
  const items = buildSeedItems(seed.lines);
  const totals = computeTotals(items);
  const counterItem = items[0];

  return {
    id: seed.id,
    code: seed.code,
    customerId: `cust-${seed.code}`,
    customerName: seed.customerName,
    contactName: seed.contactName,
    riskLevel: seed.riskLevel,
    status: seed.status,
    createdAt: isoDaysAgo(seed.daysAgo),
    paymentTerm: seed.paymentTerm,
    note: seed.note,
    items,
    totalList: Math.round(totals.listTotal * 100) / 100,
    totalRequested: Math.round(totals.requestedTotal * 100) / 100,
    marginPct: Number(totals.marginPct.toFixed(2)),
    autoApproved: false,
    counterOffer:
      seed.status === 'COUNTERED' && counterItem
        ? {
            id: `co-${seed.id}`,
            quoteId: seed.id,
            itemId: counterItem.id,
            proposedUnitPrice: seed.counterUnitPrice ?? counterItem.listUnitPrice,
            paymentTerm: seed.paymentTerm,
            note: seed.counterNote ?? 'Toptan hacim için revize fiyat talep edildi.',
            createdAt: isoDaysAgo(seed.daysAgo - 0.2),
            createdBy: 'CUSTOMER',
          }
        : undefined,
    decidedAt: seed.status === 'APPROVED' || seed.status === 'REJECTED' ? isoDaysAgo(seed.daysAgo - 0.5) : undefined,
    decisionNote: seed.decisionNote,
  };
};

/** Quotes already in the system — the admin hub opens on this queue. */
export const SEED_QUOTES: QuoteRequest[] = [
  buildSeedQuote({
    id: 'q-2048',
    code: 'TK-2048',
    customerName: 'Has Unlu Mamulleri Ltd. Şti.',
    contactName: 'Mehmet Kaya',
    riskLevel: 'MEDIUM',
    status: 'PENDING',
    daysAgo: 0.2,
    paymentTerm: 'TERM_30',
    note: 'Aylık 4 ton alım taahhüdü karşılığında fiyat revizyonu talep ediyoruz.',
    lines: [
      { productId: 'p-un-992', quantity: 100, targetUnitPrice: 415 },
      { productId: 'p-yag-418', quantity: 50, targetUnitPrice: 1165 },
    ],
  }),
  buildSeedQuote({
    id: 'q-2051',
    code: 'TK-2051',
    customerName: 'Anadolu Pastane Grubu',
    contactName: 'Selin Arı',
    riskLevel: 'LOW',
    status: 'PENDING',
    daysAgo: 0.6,
    paymentTerm: 'CASH',
    note: 'Peşin ödeme indirimi ile birlikte değerlendirilmesini rica ederiz.',
    lines: [
      { productId: 'p-kakao-771', quantity: 20, targetUnitPrice: 2700 },
      { productId: 'p-seker-512', quantity: 30, targetUnitPrice: 950 },
    ],
  }),
  buildSeedQuote({
    id: 'q-2055',
    code: 'TK-2055',
    customerName: 'Ege Fırıncılık A.Ş.',
    contactName: 'Barış Demir',
    riskLevel: 'HIGH',
    status: 'COUNTERED',
    daysAgo: 1.4,
    paymentTerm: 'TERM_30',
    note: 'Rakip tedarikçi teklifi ektedir, fiyat eşitlemesi bekliyoruz.',
    counterUnitPrice: 1190,
    counterNote: 'Kruvasan margarinde koli başına 1.190 ₺ hedefliyoruz.',
    lines: [
      { productId: 'p-yag-418', quantity: 60, targetUnitPrice: 1150 },
      { productId: 'p-un-120', quantity: 40, targetUnitPrice: 640 },
    ],
  }),
  buildSeedQuote({
    id: 'q-2041',
    code: 'TK-2041',
    customerName: 'Marmara Un Sanayi',
    contactName: 'Cem Öztürk',
    riskLevel: 'LOW',
    status: 'APPROVED',
    daysAgo: 3.2,
    paymentTerm: 'CREDIT_CARD',
    note: 'Yıllık çerçeve sözleşme kapsamında standart sipariş.',
    lines: [{ productId: 'p-un-120', quantity: 120, targetUnitPrice: 655 }],
    decisionNote: 'Marj eşiği üzerinde, otomatik onaylandı.',
  }),
];

/** Statement rows rendered by the financial ledger screen. */
export const LEDGER_ENTRIES: LedgerEntry[] = [
  {
    id: 'le-1',
    reference: 'FTR-2026-819',
    description: 'Fatura • DBS vadeli',
    date: isoDaysAgo(6),
    amount: 44000,
    type: 'INVOICE',
    status: 'PAID',
  },
  {
    id: 'le-2',
    reference: 'TK-2048',
    description: 'Onaylı teklif • 45 gün vade',
    date: isoDaysAgo(2),
    amount: 105000,
    type: 'INVOICE',
    status: 'PENDING',
  },
  {
    id: 'le-3',
    reference: 'TAH-1180',
    description: 'Cari tahsilat • Garanti BBVA',
    date: isoDaysAgo(11),
    amount: -75000,
    type: 'COLLECTION',
    status: 'PAID',
  },
  {
    id: 'le-4',
    reference: 'FTR-2026-904',
    description: 'Fatura • vadesi geçmiş',
    date: isoDaysAgo(48),
    amount: 18500,
    type: 'INVOICE',
    status: 'OVERDUE',
  },
  {
    id: 'le-5',
    reference: 'DUZ-042',
    description: 'İade düzeltmesi • kalite bildirimi',
    date: isoDaysAgo(17),
    amount: -3200,
    type: 'ADJUSTMENT',
    status: 'PAID',
  },
];

/** Statement rows per corporate customer, keyed by customer id. */
export const LEDGER_BY_CUSTOMER: Record<string, LedgerEntry[]> = {
  [CUSTOMER.id]: LEDGER_ENTRIES,
  'cust-has': [
    {
      id: 'has-1',
      reference: 'FTR-2026-777',
      description: 'Fatura • 45 gün vade',
      date: isoDaysAgo(9),
      amount: 62000,
      type: 'INVOICE',
      status: 'PENDING',
    },
    {
      id: 'has-2',
      reference: 'TK-2048',
      description: 'Onaylı teklif • 45 gün vade',
      date: isoDaysAgo(2),
      amount: 105000,
      type: 'INVOICE',
      status: 'PENDING',
    },
    {
      id: 'has-3',
      reference: 'FTR-2026-902',
      description: 'Fatura • vadesi geçmiş',
      date: isoDaysAgo(52),
      amount: 22000,
      type: 'INVOICE',
      status: 'OVERDUE',
    },
    {
      id: 'has-4',
      reference: 'TAH-1141',
      description: 'Cari tahsilat • havale',
      date: isoDaysAgo(14),
      amount: -41000,
      type: 'COLLECTION',
      status: 'PAID',
    },
  ],
  'cust-anadolu': [
    {
      id: 'ana-1',
      reference: 'TK-2051',
      description: 'Onaylı teklif • peşin',
      date: isoDaysAgo(1),
      amount: 82500,
      type: 'INVOICE',
      status: 'PENDING',
    },
    {
      id: 'ana-2',
      reference: 'FTR-2026-850',
      description: 'Fatura • DBS vadeli',
      date: isoDaysAgo(7),
      amount: 96000,
      type: 'INVOICE',
      status: 'PAID',
    },
    {
      id: 'ana-3',
      reference: 'TAH-1199',
      description: 'Cari tahsilat • Garanti BBVA',
      date: isoDaysAgo(20),
      amount: -120000,
      type: 'COLLECTION',
      status: 'PAID',
    },
  ],
  'cust-ege': [
    {
      id: 'ege-1',
      reference: 'FTR-2026-861',
      description: 'Fatura • vadesi geçmiş',
      date: isoDaysAgo(63),
      amount: 41000,
      type: 'INVOICE',
      status: 'OVERDUE',
    },
    {
      id: 'ege-2',
      reference: 'FTR-2026-830',
      description: 'Fatura • 30 gün vade',
      date: isoDaysAgo(19),
      amount: 128000,
      type: 'INVOICE',
      status: 'PENDING',
    },
    {
      id: 'ege-3',
      reference: 'TAH-1173',
      description: 'Cari tahsilat • kısmi',
      date: isoDaysAgo(30),
      amount: -52000,
      type: 'COLLECTION',
      status: 'PAID',
    },
  ],
  'cust-marmara': [
    {
      id: 'mar-1',
      reference: 'TK-2041',
      description: 'Onaylı teklif • kredi kartı',
      date: isoDaysAgo(3),
      amount: 78600,
      type: 'INVOICE',
      status: 'PENDING',
    },
    {
      id: 'mar-2',
      reference: 'FTR-2026-799',
      description: 'Fatura • DBS vadeli',
      date: isoDaysAgo(12),
      amount: 44000,
      type: 'INVOICE',
      status: 'PAID',
    },
    {
      id: 'mar-3',
      reference: 'TAH-1202',
      description: 'Cari tahsilat • havale',
      date: isoDaysAgo(25),
      amount: -60000,
      type: 'COLLECTION',
      status: 'PAID',
    },
  ],
};

/** Blended margin helper reused by seeded quotes and the admin hub. */
export const quoteMargin = (items: QuoteItem[]): number =>
  calcMarginPct(
    items.reduce((sum, item) => sum + item.requestedTotal, 0),
    items.reduce((sum, item) => sum + item.costUnitPrice * item.quantity, 0),
  );

