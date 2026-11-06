import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '../theme/tokens';
import { money } from '../utils/format';

export const QuoteNegotiationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const [counterPrice1, setCounterPrice1] = useState('430.00');
  const [status, setStatus] = useState<'PENDING' | 'ACCEPTED' | 'COUNTERED' | 'REJECTED'>('PENDING');

  const handleAccept = () => {
    setStatus('ACCEPTED');
    Alert.alert(
      'Teklif Onaylandı',
      'Teklifi kabul ettiniz. Siparişiniz oluşturuldu ve depoya sevk emri iletildi.',
      [{ text: 'Tamam', onPress: () => navigation.navigate('Home') }],
    );
  };

  const handleCounter = () => {
    setStatus('COUNTERED');
    Alert.alert(
      'Karşı Teklif İletildi',
      `₺${counterPrice1} birim fiyatlı karşı teklifiniz bölge satış yöneticisine iletildi.`,
      [{ text: 'Tamam' }],
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Teklifi Reddet',
      'Bu teklifi iptal etmek istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: () => {
            setStatus('REJECTED');
            navigation.navigate('Home');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F7F9F4]">
      {/* Top Header */}
      <View className="bg-[#536E27] px-4 py-2.5 shadow-md flex-row items-center justify-between">
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-8 w-8 items-center justify-center rounded-full bg-black/20"
        >
          <Ionicons name="arrow-back" size={17} color="#FFFFFF" />
        </Pressable>
        <View className="items-center">
          <Text className="text-[13px] font-black tracking-tight text-white">
            Teklif Talebi #TK-2048
          </Text>
          <Text className="text-[9px] text-white/80">Has Unlu Mamulleri Ltd. Şti.</Text>
        </View>
        <Pressable
          onPress={() => Alert.alert('Teklif Bilgisi', 'TK-2048 nolu dosya 45 gün vadeli DBS şartıyla açılmıştır.')}
          className="h-8 w-8 items-center justify-center rounded-full bg-black/20"
        >
          <Ionicons name="information-circle-outline" size={17} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 12, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Countdown Banner */}
        <View className="flex-row items-center justify-between rounded-xl border border-[#77AA2B]/20 bg-white px-3 py-2 shadow-sm">
          <View className="flex-row items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5">
            <View className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <Text className="text-[10px] font-black text-amber-700">
              {status === 'ACCEPTED' ? 'Onaylandı' : status === 'COUNTERED' ? 'Karşı Teklifte' : 'Değerlendirmede'}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={13} color="#77AA2B" />
            <Text className="text-[11px] font-semibold text-zinc-600">Geçerlilik:</Text>
            <Text className="font-mono text-[11px] font-bold text-red-600">23s 59d</Text>
          </View>
        </View>

        {/* AI Optimization Mini Banner */}
        <View className="mt-2.5 flex-row items-center justify-between rounded-xl border border-[#8FBE1A]/40 bg-[#8FBE1A]/15 p-2.5 shadow-sm">
          <View className="flex-row items-center gap-2">
            <View className="h-7 w-7 items-center justify-center rounded-lg bg-[#8FBE1A]">
              <Ionicons name="sparkles" size={14} color="#0e1406" />
            </View>
            <View>
              <Text className="text-[11px] font-black leading-tight text-[#536E27]">
                Yapay Zeka Fiyat Analizi
              </Text>
              <Text className="text-[9px] text-zinc-600">
                Toptancı marjı: +%7.20 • Min. Marj Onaylı
              </Text>
            </View>
          </View>
          <View className="rounded bg-[#536E27] px-2 py-0.5">
            <Text className="text-[9px] font-bold text-white">Optimum</Text>
          </View>
        </View>

        {/* Product Comparison 1 */}
        <View className="mt-3 rounded-2xl border border-[#E2E8D4] bg-white p-3 shadow-sm space-y-2.5">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-[12px] font-bold leading-tight text-zinc-900">
                Baklava & Böreklik Un (25 KG)
              </Text>
              <Text className="text-[10px] text-zinc-500">Talep: 100 Çuval</Text>
            </View>
            <View className="rounded bg-[#77AA2B]/10 px-1.5 py-0.5">
              <Text className="text-[10px] font-bold text-[#536E27]">-%2.2 İskonto</Text>
            </View>
          </View>

          {/* Price Benchmarks Grid */}
          <View className="mt-1 flex-row rounded-xl border border-[#EDF2E5] bg-[#F9FAF6] p-2">
            <View className="flex-1">
              <Text className="text-[9px] font-medium text-zinc-400">Hedefiniz</Text>
              <Text className="font-mono text-[12px] font-bold text-zinc-700">₺420.00</Text>
            </View>
            <View className="flex-1 border-x border-zinc-200 px-1 text-center items-center">
              <View className="flex-row items-center gap-0.5">
                <Ionicons name="sparkles" size={9} color="#77AA2B" />
                <Text className="text-[9px] font-bold text-[#536E27]">AI Öneri</Text>
              </View>
              <Text className="font-mono text-[12px] font-black text-[#536E27]">₺435.00</Text>
            </View>
            <View className="flex-1 items-end">
              <Text className="text-[9px] font-semibold text-zinc-500">Toptancı</Text>
              <Text className="font-mono text-[12px] font-black text-zinc-900">₺440.00</Text>
            </View>
          </View>

          {/* One-time Counter Offer Field */}
          <View className="rounded-xl border border-[#8FBE1A] bg-[#F0F5E6] p-2">
            <View className="flex-row items-center justify-between text-[10px] mb-1">
              <Text className="text-[10px] font-bold text-[#536E27]">
                Karşı Teklif Fiyatı Girin (₺)
              </Text>
              <Text className="text-[9px] text-zinc-500">Son 1 Değişiklik Hakkı</Text>
            </View>
            <View className="flex-row items-center justify-between rounded-lg border border-[#77AA2B]/30 bg-white px-2.5 py-1">
              <TextInput
                value={counterPrice1}
                onChangeText={setCounterPrice1}
                keyboardType="decimal-pad"
                className="flex-1 font-mono text-[12px] font-bold text-zinc-900"
              />
              <Text className="text-[9px] text-zinc-400">Çuval Başına</Text>
            </View>
          </View>
        </View>

        {/* Product Comparison 2 */}
        <View className="mt-3 rounded-2xl border border-[#E2E8D4] bg-white p-3 shadow-sm space-y-2.5">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-[12px] font-bold leading-tight text-zinc-900">
                Pastacılık Kruvasan Yağı
              </Text>
              <Text className="text-[10px] text-zinc-500">Talep: 50 Koli</Text>
            </View>
            <View className="rounded bg-[#77AA2B]/10 px-1.5 py-0.5">
              <Text className="text-[10px] font-bold text-[#536E27]">-%2.4 İskonto</Text>
            </View>
          </View>

          {/* Price Benchmarks Grid */}
          <View className="mt-1 flex-row rounded-xl border border-[#EDF2E5] bg-[#F9FAF6] p-2">
            <View className="flex-1">
              <Text className="text-[9px] font-medium text-zinc-400">Hedefiniz</Text>
              <Text className="font-mono text-[12px] font-bold text-zinc-700">₺1,150.00</Text>
            </View>
            <View className="flex-1 border-x border-zinc-200 px-1 text-center items-center">
              <View className="flex-row items-center gap-0.5">
                <Ionicons name="sparkles" size={9} color="#77AA2B" />
                <Text className="text-[9px] font-bold text-[#536E27]">AI Öneri</Text>
              </View>
              <Text className="font-mono text-[12px] font-black text-[#536E27]">₺1,180.00</Text>
            </View>
            <View className="flex-1 items-end">
              <Text className="text-[9px] font-semibold text-zinc-500">Toptancı</Text>
              <Text className="font-mono text-[12px] font-black text-zinc-900">₺1,220.00</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer Dual / Triple Action */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-[#3B4D20] bg-[#253213] p-3 shadow-2xl">
        <View className="mb-2 flex-row items-center justify-between border-b border-white/10 pb-1.5 text-[11px]">
          <Text className="text-[11px] text-zinc-300">Net Toplam Tutar:</Text>
          <Text className="font-mono text-[13px] font-black text-white">
            ₺105.000 <Text className="text-[9px] text-[#8FBE1A]">+ KDV</Text>
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Pressable
            onPress={handleAccept}
            className="flex-1 items-center justify-center rounded-xl bg-[#8FBE1A] py-2.5 active:bg-[#7ea717]"
          >
            <Text className="text-[10px] font-black text-zinc-950">
              Teklifi Kabul Et & Sipariş Ver
            </Text>
          </Pressable>
          <Pressable
            onPress={handleCounter}
            className="items-center justify-center rounded-xl border border-[#77AA2B] px-2.5 py-2 active:bg-white/5"
          >
            <Text className="text-[10px] font-bold text-[#8FBE1A]">
              Karşı Teklif
            </Text>
          </Pressable>
          <Pressable
            onPress={handleReject}
            className="items-center justify-center rounded-xl bg-[#EF4444] px-2.5 py-2 active:bg-red-700"
          >
            <Text className="text-[10px] font-bold text-white">Reddet</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

