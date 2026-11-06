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

import { useApp } from '../context/AppContext';
import { palette } from '../theme/tokens';
import { money } from '../utils/format';

export const AdminApprovalHubScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { quotes, approveQuote, rejectQuote, toggleRole } = useApp();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'COUNTERED' | 'DONE'>('PENDING');
  const [manualPrice, setManualPrice] = useState('440.00');

  const handleUpdatePrice = () => {
    Alert.alert('Fiyat Güncellendi', `Manuel birim fiyat ₺${manualPrice} olarak güncellendi.`);
  };

  const handleSendToAdmin = () => {
    Alert.alert(
      'Yönetici Onayına Sunuldu',
      'Teklif dosyası ve marj raporu Bölge Satış Müdürü ekranına iletildi.',
      [{ text: 'Tamam' }],
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#536E27]">
      {/* Header Nav */}
      <View className="bg-[#536E27] px-4 py-2.5 shadow-md flex-row items-center justify-between">
        <Pressable
          onPress={toggleRole}
          className="h-8 w-8 items-center justify-center rounded-full bg-black/20"
        >
          <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" />
        </Pressable>
        <View className="items-center">
          <Text className="text-[13px] font-black tracking-tight text-white">
            Teklif İnceleme & Onay
          </Text>
          <Text className="text-[9px] text-white/80">
            Operasyonel Marj & Yetki Denetimi
          </Text>
        </View>
        <Pressable
          onPress={() => Alert.alert('Yönetici Filtresi', 'Onay bekleyen ve yetki aşımı olan teklifler listeleniyor.')}
          className="h-8 w-8 items-center justify-center rounded-full bg-black/20"
        >
          <Ionicons name="options-outline" size={16} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Sub Tabs */}
      <View className="bg-white border-b border-zinc-200 px-3 flex-row items-center justify-around">
        {[
          { id: 'PENDING', label: 'Onay Bekleyenler (4)' },
          { id: 'COUNTERED', label: 'Karşı Teklifler (2)' },
          { id: 'DONE', label: 'Tamamlananlar' },
        ].map((tabItem) => {
          const active = activeTab === tabItem.id;
          return (
            <Pressable
              key={tabItem.id}
              onPress={() => setActiveTab(tabItem.id as any)}
              className={`py-2.5 px-2 border-b-2 ${
                active ? 'border-[#536E27]' : 'border-transparent'
              }`}
            >
              <Text
                className={`text-[11px] font-bold ${
                  active ? 'text-[#536E27]' : 'text-zinc-400'
                }`}
              >
                {tabItem.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1 bg-[#F7F9F4]"
        contentContainerStyle={{ padding: 12, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Pricing Assist Box */}
        <View className="rounded-2xl border border-[#8FBE1A]/30 bg-[#253213] p-3.5 shadow-md space-y-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full bg-[#8FBE1A]" />
              <Ionicons name="bulb-outline" size={14} color="#8FBE1A" />
              <Text className="text-xs font-bold text-white">
                AI Fiyat Destek Paneli
              </Text>
            </View>
            <View className="rounded-full bg-[#8FBE1A] px-2 py-0.5">
              <Text className="text-[9px] font-extrabold text-zinc-950">%94 Güven</Text>
            </View>
          </View>

          {/* Metrics Matrix */}
          <View className="flex-row rounded-xl border border-white/10 bg-black/30 p-2 text-center">
            <View className="flex-1 items-center">
              <Text className="text-[9px] text-zinc-300">Maliyet (COGS)</Text>
              <Text className="font-mono text-[11px] font-bold text-white">₺392 / Çv</Text>
            </View>
            <View className="flex-1 items-center border-x border-white/10 px-1">
              <Text className="text-[9px] text-zinc-300">Geçmiş Ort.</Text>
              <Text className="font-mono text-[11px] font-bold text-white">₺438 / Çv</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-[9px] font-bold text-[#8FBE1A]">AI Tavsiye</Text>
              <Text className="font-mono text-[11px] font-black text-[#8FBE1A]">
                ₺445 / Çv
              </Text>
            </View>
          </View>

          {/* Dynamic Margin Bar */}
          <View className="mt-1">
            <View className="flex-row items-center justify-between text-[10px] mb-1">
              <Text className="text-[10px] text-zinc-300">Öngörülen Net Marj:</Text>
              <Text className="font-mono text-[11px] font-extrabold text-[#8FBE1A]">
                +%12.4 Net Marj
              </Text>
            </View>
            <View className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
              <View className="h-full w-[78%] rounded-full bg-[#8FBE1A]" />
            </View>
          </View>
        </View>

        {/* Manual Revision & Warning Card */}
        <View className="mt-3 rounded-2xl border border-[#E2E8D4] bg-white p-3.5 shadow-sm space-y-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[12px] font-bold text-zinc-900 leading-tight">
                Baklava Unu Teklifi Revizyonu
              </Text>
              <Text className="text-[10px] text-zinc-500">Müşteri Hedefi: ₺420.00</Text>
            </View>
            <View className="flex-row items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5">
              <Ionicons name="warning" size={10} color="#DC2626" />
              <Text className="text-[9px] font-bold text-red-700">Admin Onayı Gerekli</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between rounded-xl bg-[#F7F9F4] p-2 text-[11px]">
            <Text className="text-[11px] font-medium text-zinc-600">
              Manuel Sunulacak Fiyat:
            </Text>
            <View className="flex-row items-center gap-1">
              <TextInput
                value={manualPrice}
                onChangeText={setManualPrice}
                keyboardType="decimal-pad"
                className="w-20 rounded-lg border border-[#536E27] bg-white px-2 py-1 text-right font-mono text-[12px] font-black text-zinc-900"
              />
              <Text className="text-[10px] font-bold text-zinc-500">₺</Text>
            </View>
          </View>

          <View className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5">
            <Text className="text-[10px] leading-relaxed text-zinc-600">
              <Text className="font-bold text-amber-800">Yetki Notu: </Text>
              %10 üzeri iskonto verildiği için teklif otomatik olarak Bölge Satış Müdürü
              ekranına düşecektir.
            </Text>
          </View>
        </View>

        {/* Representative Note Box */}
        <View className="mt-3 rounded-xl border border-[#E2E8D4] bg-white p-3 text-[11px]">
          <View className="flex-row items-center gap-1.5 font-bold text-[#536E27] mb-1">
            <Ionicons name="create-outline" size={13} color="#536E27" />
            <Text className="text-[11px] font-bold text-[#536E27]">
              Temsilci Değerlendirme Notu
            </Text>
          </View>
          <Text className="text-[10px] leading-relaxed text-zinc-600 italic">
            "Müşteri aylık 4 ton alım taahhüt ediyor. Bu marjla onaylanırsa 6 aylık sözleşme
            imzalanacak."
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Footer Dual Action */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-[#3B4D20] bg-[#253213] p-3 shadow-2xl">
        <View className="flex-row gap-2">
          <Pressable
            onPress={handleUpdatePrice}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-[#536E27] py-2.5 active:bg-[#43591f]"
          >
            <Ionicons name="create-outline" size={13} color="#FFFFFF" />
            <Text className="text-[11px] font-bold text-white">Fiyatları Güncelle</Text>
          </Pressable>

          <Pressable
            onPress={handleSendToAdmin}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#8FBE1A] py-2.5 shadow-md active:bg-[#7ea717]"
          >
            <Ionicons name="checkmark-done" size={13} color="#0e1406" />
            <Text className="text-[11px] font-black text-zinc-950">
              Admin Onayına Gönder
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};
