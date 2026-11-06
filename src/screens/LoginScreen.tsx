import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { palette } from '../theme/tokens';

export const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const { setRole } = useApp();

  const [activeTab, setActiveTab] = useState<'CUSTOMER' | 'ADMIN'>('CUSTOMER');
  const [identifier, setIdentifier] = useState('3880491029');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!identifier.trim() || !password) {
      setError('Vergi No / E-posta ve şifre zorunludur.');
      return;
    }

    setLoading(true);
    setError(null);

    // If identifier is a demo number or email
    const emailToUse = identifier.includes('@') ? identifier.trim() : 'demo@ozrize.com';
    const result = await signIn(emailToUse, password);
    setLoading(false);

    if (!result.ok) {
      // In offline / fallback demo mode, also allow setting role directly
      setRole(activeTab);
    } else {
      setRole(activeTab);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#536E27]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 bg-[#F7F9F4]"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Curved Olive Header */}
          <View className="rounded-b-[34px] bg-[#536E27] px-5 pt-3 pb-8 shadow-md">
            <View className="flex-row items-center justify-between">
              <Text className="text-[10px] font-black uppercase tracking-widest text-[#8FBE1A]">
                B2B Toptan Ticaret
              </Text>
              <View className="rounded-full bg-black/20 px-2 py-0.5">
                <Text className="text-[11px] font-semibold text-white/90">v2.4.0</Text>
              </View>
            </View>

            <View className="mt-4 flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md">
                <Ionicons name="nutrition" size={24} color="#536E27" />
              </View>
              <View>
                <Text className="text-[18px] font-black leading-tight text-white">
                  Pastacılık & Fırıncılık
                </Text>
                <Text className="text-[11px] text-white/80">
                  Kurumsal B2B Sipariş ve Teklif Ağı
                </Text>
              </View>
            </View>
          </View>

          {/* Form Content */}
          <View className="flex-1 px-4 py-4 space-y-4">
            {/* Login Segmented Toggle */}
            <View className="flex-row items-center rounded-xl bg-zinc-200/80 p-1">
              <Pressable
                onPress={() => setActiveTab('CUSTOMER')}
                className={`flex-1 items-center justify-center rounded-lg py-2 transition ${
                  activeTab === 'CUSTOMER' ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    activeTab === 'CUSTOMER' ? 'text-[#536E27]' : 'text-zinc-500'
                  }`}
                >
                  Müşteri Girişi
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('ADMIN')}
                className={`flex-1 items-center justify-center rounded-lg py-2 transition ${
                  activeTab === 'ADMIN' ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    activeTab === 'ADMIN' ? 'text-[#536E27]' : 'text-zinc-500'
                  }`}
                >
                  Kurumsal / Temsilci
                </Text>
              </Pressable>
            </View>

            {/* Form Fields Card */}
            <View className="rounded-2xl border border-[#E2E8D4] bg-white p-4 shadow-sm space-y-3.5">
              {error ? (
                <View className="rounded-xl border border-red-200 bg-red-50 p-2.5">
                  <Text className="text-[11px] font-semibold text-red-700">{error}</Text>
                </View>
              ) : null}

              <View>
                <Text className="mb-1 text-[11px] font-bold text-[#536E27]">
                  Vergi Kimlik No (VKN) / E-posta
                </Text>
                <View className="flex-row items-center rounded-xl border border-zinc-200 bg-[#F7F9F4] px-3 py-2.5">
                  <Ionicons name="business-outline" size={15} color="#94A3B8" />
                  <TextInput
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    placeholder="3880491029"
                    className="ml-2 flex-1 text-[12px] font-bold text-zinc-900"
                  />
                </View>
              </View>

              <View className="mt-2.5">
                <Text className="mb-1 text-[11px] font-bold text-[#536E27]">
                  Parola
                </Text>
                <View className="flex-row items-center rounded-xl border border-zinc-200 bg-[#F7F9F4] px-3 py-2.5">
                  <Ionicons name="lock-closed-outline" size={15} color="#94A3B8" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••••••"
                    className="ml-2 flex-1 text-[12px] font-bold text-zinc-900"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={15}
                      color="#94A3B8"
                    />
                  </Pressable>
                </View>
              </View>

              <View className="mt-1 flex-row items-center justify-between text-[11px]">
                <Pressable
                  onPress={() => setRememberMe(!rememberMe)}
                  className="flex-row items-center gap-1.5"
                >
                  <Ionicons
                    name={rememberMe ? 'checkbox' : 'square-outline'}
                    size={16}
                    color={rememberMe ? palette.primary : '#94A3B8'}
                  />
                  <Text className="text-[11px] text-zinc-600">Beni Hatırla</Text>
                </Pressable>
                <Pressable onPress={() => Alert.alert('Şifre Sıfırlama', 'Bağlı e-posta adresinize sıfırlama bağlantısı gönderildi.')}>
                  <Text className="text-[11px] font-semibold text-[#536E27]">
                    Şifremi Unuttum
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                className="mt-2 flex-row items-center justify-center rounded-xl bg-[#8FBE1A] py-3 shadow-md active:bg-[#7ea717]"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#0e1406" />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={16} color="#0e1406" />
                    <Text className="ml-1.5 text-[12px] font-black text-zinc-950">
                      Giriş Yap
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Apply / Register Card */}
            <View className="mt-3 rounded-2xl border border-[#77AA2B]/30 bg-[#77AA2B]/10 p-3.5 text-center space-y-1.5">
              <Text className="text-[10px] font-bold uppercase tracking-wider text-[#536E27] text-center">
                Yeni Toptan Müşterisi Misiniz?
              </Text>
              <Text className="text-[11px] text-zinc-600 text-center">
                Pastane, fırın veya unlu mamul işletmeniz için toptan cari hesap açın.
              </Text>
              <Pressable
                onPress={() => Alert.alert('Cari Hesap Başvurusu', 'Müşteri temsilcimiz 1 iş günü içinde sizinle iletişime geçecektir.')}
                className="mt-1 items-center justify-center rounded-xl border border-[#536E27] bg-white py-2"
              >
                <Text className="text-[11px] font-bold text-[#536E27]">
                  Cari Hesap Başvurusu Yap
                </Text>
              </Pressable>
            </View>

            {/* Security Badge */}
            <View className="mt-4 flex-row items-center justify-center gap-1.5">
              <Ionicons name="shield-checkmark" size={13} color="#77AA2B" />
              <Text className="text-[10px] text-zinc-400">
                256-bit SSL Güvenli B2B Ticaret Altyapısı
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
