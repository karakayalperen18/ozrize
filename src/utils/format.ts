/** Formatting helpers — deterministic, ICU-free so they behave the same on
 *  Hermes (Android/iOS) and on the web target. */

const groupThousands = (integer: string): string =>
  integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** 1234567.5 -> "1.234.567,50" */
export const formatNumber = (value: number, decimals = 2): string => {
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = Math.abs(safe).toFixed(decimals);
  const [integerPart, fractionPart] = fixed.split('.');
  const grouped = groupThousands(integerPart ?? '0');
  const sign = safe < 0 ? '-' : '';
  return fractionPart ? `${sign}${grouped},${fractionPart}` : `${sign}${grouped}`;
};

/** 1234.5 -> "₺1.234,50" */
export const money = (value: number, decimals = 2): string =>
  `₺${formatNumber(value, decimals)}`;

/** 340000 -> "₺340.000" (no kuruş, used in dense tiles/badges). */
export const moneyShort = (value: number): string => `₺${formatNumber(value, 0)}`;

/** 12.34 -> "%12,3" */
export const percent = (value: number, decimals = 1): string =>
  `%${formatNumber(value, decimals)}`;

/** ISO string -> "04.11.2026" */
export const dateTR = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
};

/** ISO string -> "04.11.2026 • 17:31" */
export const dateTimeTR = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${dateTR(iso)} • ${hours}:${minutes}`;
};

/** Initials used by the avatar chip: "Lezzet Pastaneleri A.Ş." -> "LP" */
export const initials = (name: string): string =>
  name
    .replace(/\b(A\.Ş\.|Ltd\.|Şti\.|AŞ|AS)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
