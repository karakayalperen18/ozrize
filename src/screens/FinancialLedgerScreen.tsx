import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '../context/AppContext';
import { money } from '../utils/format';

export const FinancialLedgerScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { customer, credit, toggleRole } = useApp();

  const handleDownloadPdf = () => {
    Alert.alert(
      'Cari Ekstre İndiriliyor',
      `${customer.name} ait 2024 yılı resmi e-ekstre PDF dosyası hazırlanıyor.`,
      [{ text: 'Tamam' }],
    );
  };

  const handlePaymentNotification = () => {
    Alert.alert(
      'Ödeme Bildirimi',
      'Havale / EFT veya DBS ödeme dekontunuzu yüklemek için dosya seçici açılıyor.',
      [{ text: 'Dekont Seç' }, { text: 'Vazgeç', style: 'cancel' }],
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#536E27]">
      {/* Header Nav */}
      <View className="bg-[#536E27] px-4 py-2.5 shadow-md flex-row items-center justify-between">
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-8 w-8 items-center justify-center rounded-full bg-black/20"
        >
          <Ionicons name="arrow-back" size={17} color="#FFFFFF" />
        </Pressable>
        <View className="items-center">
          <Text className="text-[13px] font-black tracking-tight text-white">
            Cari Hesap & Risk Durumu
          </Text>
          <Text className="text-[9px] text-white/80">{customer.name}</Text>
        </View>
        <Pressable
          onPress={handleDownloadPdf}
          className="h-8 w-8 items-center justify-center rounded-full bg-black/20"
        >
          <Ionicons name="download-outline" size={16} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1 bg-[#F7F9F4]"
        contentContainerStyle={{ padding: 12, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Financial Cards 2x2 Grid */}
        <View className="flex-row flex-wrap gap-2.5">
          {/* Card 1 */}
          <View className="flex-1 min-w-[46%] rounded-2xl border border-[#E2E8D4] bg-white p-3 shadow-sm">
            <Text className="text-[10px] font-bold uppercase text-zinc-400">
              Toplam Borç
            </Text>
            <Text className="mt-0.5 font-mono text-[16px] font-black text-zinc-900">
              ₺180.000
            </Text>
            <Text className="text-[9px] text-zinc-500 mt-0.5">Güncel Açık Hesap</Text>
          </View>

          {/* Card 2 */}
          <View className="flex-1 min-w-[46%] rounded-2xl border border-[#E2E8D4] bg-white p-3 shadow-sm">
            <Text className="text-[10px] font-bold uppercase text-zinc-400">
              Vadesi Geçmiş
            </Text>
            <Text className="mt-0.5 font-mono text-[16px] font-black text-emerald-600">
              ₺0.00
            </Text>
            <Text className="text-[9px] font-semibold text-emerald-700 mt-0.5">
              Gecikme Yok
            </Text>
          </View>

          {/* Card 3 */}
          <View className="flex-1 min-w-[46%] rounded-2xl border border-[#E2E8D4] bg-white p-3 shadow-sm">
            <Text className="text-[10px] font-bold uppercase text-zinc-400">
              Kalan Limit
            </Text>
            <Text className="mt-0.5 font-mono text-[16px] font-black text-[#536E27]">
              ₺160.000
            </Text>
            <Text className="text-[9px] text-zinc-500 mt-0.5">Toplam: ₺500.000</Text>
          </View>

          {/* Card 4 */}
          <View className="flex-1 min-w-[46%] rounded-2xl border border-[#E2E8D4] bg-white p-3 shadow-sm">
            <Text className="text-[10px] font-bold uppercase text-zinc-400">
              Risk Derecesi
            </Text>
            <View className="mt-0.5 flex-row items-center gap-1.5">
              <Text className="text-[15px] font-black text-zinc-900">
                Skor: {credit.riskScore || 'A'}
              </Text>
              <View className="h-2.5 w-2.5 rounded-full bg-[#8FBE1A]" />
            </View>
            <Text className="text-[9px] text-zinc-500 mt-0.5">Güvenli Müşteri</Text>
          </View>
        </View>

        {/* Account Movements Header */}
        <View className="mt-4 flex-row items-center justify-between px-1">
          <Text className="text-[11px] font-black uppercase tracking-wider text-[#536E27]">
            Son Hesap Hareketleri
          </Text>
          <Text className="text-[10px] text-zinc-500">Son 30 Gün</Text>
        </View>

        {/* Transaction List */}
        <View className="mt-2 space-y-2">
          {/* Tx 1 */}
          <View className="flex-row items-center justify-between rounded-xl border border-[#E2E8D4] bg-white p-2.5 shadow-sm mb-2">
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <Ionicons name="receipt-outline" size={17} color="#047857" />
              </View>
              <View>
                <Text className="text-[12px] font-bold leading-tight text-zinc-900">
                  Fatura #FTR-2024-819
                </Text>
                <Text className="text-[9px] text-zinc-400">
                  12 Mayıs 2024 • DBS Vadeli
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="font-mono text-[12px] font-black text-zinc-900">
                ₺44.000
              </Text>
              <View className="mt-0.5 rounded bg-emerald-100 px-1.5 py-0.5">
                <Text className="text-[9px] font-bold text-emerald-800">Ödendi</Text>
              </View>
            </View>
          </View>

          {/* Tx 2 */}
          <View className="flex-row items-center justify-between rounded-xl border border-[#E2E8D4] bg-white p-2.5 shadow-sm mb-2">
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <Ionicons name="hourglass-outline" size={17} color="#B45309" />
              </View>
              <View>
                <Text className="text-[12px] font-bold leading-tight text-zinc-900">
                  Teklif #TK-2048 (Onaylı)
                </Text>
                <Text className="text-[9px] text-zinc-400">
                  02 Haziran 2024 • Vade 45 Gün
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="font-mono text-[12px] font-black text-zinc-900">
                ₺105.000
              </Text>
              <View className="mt-0.5 rounded bg-amber-100 px-1.5 py-0.5">
                <Text className="text-[9px] font-bold text-amber-800">Beklemede</Text>
              </View>
            </View>
          </View>

          {/* Tx 3 */}
          <View className="flex-row items-center justify-between rounded-xl border border-[#E2E8D4] bg-white p-2.5 shadow-sm mb-2">
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Ionicons name="arrow-down" size={17} color="#1D4ED8" />
              </View>
              <View>
                <Text className="text-[12px] font-bold leading-tight text-zinc-900">
                  Cari Tahsilat / Havale
                </Text>
                <Text className="text-[9px] text-zinc-400">
                  28 Nisan 2024 • Garanti BBVA
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="font-mono text-[12px] font-black text-[#536E27]">
                -₺75.000
              </Text>
              <View className="mt-0.5 rounded bg-[#8FBE1A]/20 px-1.5 py-0.5">
                <Text className="text-[9px] font-bold text-[#536E27]">İşlendi</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Financial Action Buttons */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-[#3B4D20] bg-[#253213] p-3 shadow-2xl">
        <View className="flex-row gap-2">
          <Pressable
            onPress={handleDownloadPdf}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 py-2.5 active:bg-white/20"
          >
            <Ionicons name="document-text-outline" size={14} color="#FFFFFF" />
            <Text className="text-[11px] font-bold text-white">Cari Ekstre (PDF)</Text>
          </Pressable>

          <Pressable
            onPress={handlePaymentNotification}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#8FBE1A] py-2.5 shadow-md active:bg-[#7ea717]"
          >
            <Ionicons name="cash-outline" size={14} color="#0e1406" />
            <Text className="text-[11px] font-black text-zinc-950">
              Ödeme Bildirimi
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};
