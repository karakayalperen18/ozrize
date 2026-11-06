/**
 * Supabase bağlantı bilgileri — EXPO_PUBLIC_* ortam değişkenlerinden okunur.
 * Değerler yoksa uygulama "çevrimdışı demo" modunda (mock veri) çalışmaya devam eder.
 */

export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

/** Supabase yalnızca URL ve anon key birlikte verildiğinde aktiftir. */
export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
