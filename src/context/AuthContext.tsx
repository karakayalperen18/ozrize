import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';

import { isSupabaseConfigured } from '../api/config';
import { supabase } from '../api/client';

type AuthStatus = 'OFFLINE' | 'LOADING' | 'SIGNED_IN' | 'SIGNED_OUT';

interface SignInResult {
  ok: boolean;
  message?: string;
}

interface AuthContextValue {
  /** OFFLINE: Supabase yok (demo). LOADING: oturum kontrol ediliyor. */
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** JWT oturumunu yönetir; Supabase yapılandırılmadığında OFFLINE kalır. */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? 'LOADING' : 'OFFLINE',
  );
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) {
      setStatus('OFFLINE');
      return undefined;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setStatus(data.session ? 'SIGNED_IN' : 'SIGNED_OUT');
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setStatus(session ? 'SIGNED_IN' : 'SIGNED_OUT');
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    if (!supabase) {
      return { ok: false, message: 'Supabase yapılandırılmadı.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setStatus(supabase ? 'SIGNED_OUT' : 'OFFLINE');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signOut }),
    [status, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
};
