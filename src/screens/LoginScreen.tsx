import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { palette } from '../theme/tokens';

/** Supabase yapılandırıldığında gösterilen JWT giriş ekranı. */
export const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('E-posta ve şifre zorunludur.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (!result.ok) setError(result.message ?? 'Giriş başarısız.');
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          <View className="items-center">
            <View className="h-16 w-16 items-center justify-center rounded-3xl bg-brand-primary">
              <Ionicons name="leaf" size={30} color={palette.accent} />
            </View>
            <Text className="mt-3 text-[22px] font-black text-brand-text">
              B2B Toptan Ticaret
            </Text>
            <Text className="mt-1 text-center text-[12px] text-brand-muted">
              Kurumsal hesabınızla giriş yapın
            </Text>
          </View>

          <View className="mt-6 rounded-card border border-brand-border bg-white p-4">
            <Text className="text-[9px] font-bold uppercase tracking-label text-brand-muted">
              E-posta
            </Text>
            <View className="mt-1.5 flex-row items-center rounded-xl border border-brand-border bg-brand-bg px-3 py-2">
              <Ionicons name="mail-outline" size={14} color={palette.muted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="ornek@sirket.com"
                placeholderTextColor="#94A3B8"
                className="ml-2 flex-1 text-[13px] font-semibold text-brand-text"
                accessibilityLabel="E-posta"
              />
            </View>

            <Text className="mt-3 text-[9px] font-bold uppercase tracking-label text-brand-muted">
              Şifre
            </Text>
            <View className="mt-1.5 flex-row items-center rounded-xl border border-brand-border bg-brand-bg px-3 py-2">
              <Ionicons name="lock-closed-outline" size={14} color={palette.muted} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                className="ml-2 flex-1 text-[13px] font-semibold text-brand-text"
                accessibilityLabel="Şifre"
                onSubmitEditing={submit}
              />
            </View>

            {error ? (
              <View className="mt-3 flex-row items-center rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                <Ionicons name="alert-circle" size={13} color={palette.danger} />
                <Text className="ml-1.5 flex-1 text-[10px] font-semibold text-red-700">
                  {error}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={submit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Giriş yap"
              className={`mt-4 flex-row items-center justify-center rounded-xl bg-brand-accent py-3 ${
                loading ? 'opacity-60' : 'active:opacity-80'
              }`}
            >
              {loading ? (
                <ActivityIndicator color={palette.dark} />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={15} color={palette.dark} />
                  <Text className="ml-1.5 text-[13px] font-bold text-brand-dark">Giriş Yap</Text>
                </>
              )}
            </Pressable>
          </View>

          <Text className="mt-4 text-center text-[9px] text-brand-muted">
            JWT ile güvenli oturum • Supabase Auth
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
