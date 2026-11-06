import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

/**
 * Paylaşılan Supabase istemcisi. Çevrimdışı demo modunda `null` kalır.
 *
 * Oturum, demo amacıyla bellekte tutulur (`persistSession: false`); kalıcı oturum
 * için `@react-native-async-storage/async-storage` eklenip `auth.storage` olarak
 * verilmelidir. JWT, istemci tarafında otomatik olarak her isteğe eklenir.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
