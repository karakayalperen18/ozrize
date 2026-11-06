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

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { customer, credit, cartItems, addToCart, products, toggleRole, role } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const limit = credit.limit || 500000;
  const outstanding = credit.outstanding || 340000;
  const available = credit.available || 160000;
  const utilizationPct = Math.round((outstanding / limit) * 100);

  const handleQuickAdd = (productSku: string) => {
    const prod = products.find((p) => p.sku === productSku) || products[0];
    if (prod) {
      addToCart(prod.id, prod.moq);
      Alert.alert(
        'Teklife Eklendi',
        `${prod.name} (${prod.moq} ${prod.unit}) teklif sepetinize eklendi.`,
        [
          { text: 'Alışverişe Devam Et' },
          { text: 'Sepete Git', onPress: () => navigation.navigate('QuoteBuilder') },
        ],
      );
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F7F9F4]">
      {/* Top Status Bar / Header with Client Info */}
      <View className="bg-[#536E27] px-4 pt-3 pb-4 shadow-md">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <Text className="text-[12px] font-black text-[#8FBE1A]">LP</Text>
            </View>
            <View>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[13px] font-black leading-tight text-white">
                  {customer.name}
                </Text>
                <View className="rounded-full bg-[#8FBE1A] px-1.5 py-0.5">
                  <Text className="text-[9px] font-black text-[#0e1406]">
                    Risk: {credit.riskScore || 'A'}
                  </Text>
                </View>
              </View>
              <Text className="text-[10px] text-white/75">
                Müşteri No: #{customer.code}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={toggleRole}
              className="flex-row items-center rounded-full bg-black/25 px-2.5 py-1"
            >
              <Ionicons name="swap-horizontal" size={12} color={palette.accent} />
              <Text className="ml-1 text-[9px] font-bold text-white">
                {role === 'ADMIN' ? 'Müşteri' : 'Admin'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => Alert.alert('Bildirimler', 'Yeni kampanya ve onaylanmış 1 teklifiniz var.')}
              className="h-8 w-8 items-center justify-center rounded-full bg-white/10"
            >
              <Ionicons name="notifications-outline" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Credit Limit Bar in Header */}
        <View className="mt-3.5 rounded-xl border border-white/10 bg-black/25 p-2.5">
          <View className="flex-row items-center justify-between text-[10px]">
            <Text className="text-[10px] font-medium text-zinc-300">
              Açık Hesap / Kredi Limiti
            </Text>
            <Text className="font-mono text-[11px] font-bold text-white">
              {money(outstanding, 0)} / {money(limit, 0)}
            </Text>
          </View>
          <View className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/40">
            <View
              className="h-full rounded-full bg-[#8FBE1A]"
              style={{ width: `${Math.min(utilizationPct, 100)}%` }}
            />
          </View>
          <View className="mt-1.5 flex-row items-center justify-between text-[9px]">
            <Text className="text-[9px] text-zinc-300">%{utilizationPct} Kullanıldı</Text>
            <Text className="text-[9px] font-bold text-[#8FBE1A]">
              Kalan: {money(available, 0)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View className="flex-row items-center rounded-xl border border-[#CCD8B8] bg-white px-3 py-2.5 shadow-sm">
          <Ionicons name="search" size={15} color="#94A3B8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Un, margarin, kakao veya ürün kodu ara..."
            placeholderTextColor="#94A3B8"
            className="ml-2 flex-1 text-[12px] text-zinc-800"
            onSubmitEditing={() => navigation.navigate('Catalog')}
          />
          <Pressable onPress={() => Alert.alert('Sesli Arama', 'Mikrofon dinleniyor...')}>
            <Ionicons name="mic-outline" size={16} color={palette.primary} />
          </Pressable>
        </View>

        {/* Quick Action Grid */}
        <View className="mt-3.5 flex-row flex-wrap gap-2">
          {/* Action 1 */}
          <Pressable
            onPress={() => navigation.navigate('Catalog')}
            className="flex-1 min-w-[46%] justify-between rounded-2xl bg-[#536E27] p-3 shadow-sm h-24"
          >
            <View className="h-7 w-7 items-center justify-center rounded-xl bg-[#8FBE1A]">
              <Ionicons name="add" size={18} color="#0e1406" />
            </View>
            <View>
              <Text className="text-[12px] font-black leading-tight text-white">
                Yeni Teklif Talebi
              </Text>
              <Text className="text-[9px] text-white/75">Toplu iskonto iste</Text>
            </View>
          </Pressable>

          {/* Action 2 */}
          <Pressable
            onPress={() => navigation.navigate('Negotiation')}
            className="flex-1 min-w-[46%] justify-between rounded-2xl border border-[#E2E8D4] bg-white p-3 shadow-sm h-24"
          >
            <View className="flex-row items-start justify-between">
              <View className="h-7 w-7 items-center justify-center rounded-xl bg-amber-100">
                <Ionicons name="time-outline" size={16} color="#B45309" />
              </View>
              <View className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5">
                <Text className="text-[9px] font-bold text-amber-700">3 Aktif</Text>
              </View>
            </View>
            <View>
              <Text className="text-[12px] font-bold leading-tight text-zinc-900">
                Aktif Tekliflerim
              </Text>
              <Text className="text-[9px] text-zinc-500">Pazarlıkta 2 dosya</Text>
            </View>
          </Pressable>

          {/* Action 3 */}
          <Pressable
            onPress={() => Alert.alert('Geçmiş Siparişler', 'Son sevkiyat yolda: 1 Frigorifik araç dağıtımda.')}
            className="flex-1 min-w-[46%] justify-between rounded-2xl border border-[#E2E8D4] bg-white p-3 shadow-sm h-24"
          >
            <View className="h-7 w-7 items-center justify-center rounded-xl bg-blue-50">
              <Ionicons name="car-outline" size={16} color="#1D4ED8" />
            </View>
            <View>
              <Text className="text-[12px] font-bold leading-tight text-zinc-900">
                Geçmiş Siparişler
              </Text>
              <Text className="text-[9px] text-zinc-500">1 Sevkiyatta</Text>
            </View>
          </Pressable>

          {/* Action 4 */}
          <Pressable
            onPress={() => navigation.navigate('Ledger')}
            className="flex-1 min-w-[46%] justify-between rounded-2xl border border-[#E2E8D4] bg-white p-3 shadow-sm h-24"
          >
            <View className="h-7 w-7 items-center justify-center rounded-xl bg-emerald-50">
              <Ionicons name="document-text-outline" size={16} color="#047857" />
            </View>
            <View>
              <Text className="text-[12px] font-bold leading-tight text-zinc-900">
                Cari Hesap & Ekstre
              </Text>
              <Text className="text-[9px] text-zinc-500">Bakiye & Risk</Text>
            </View>
          </Pressable>
        </View>

        {/* Campaign Promo Card */}
        <View className="mt-3.5 overflow-hidden rounded-2xl bg-[#253213] p-3.5 shadow-sm">
          <View className="self-start rounded-full bg-[#8FBE1A] px-2 py-0.5">
            <Text className="text-[9px] font-black uppercase tracking-wider text-zinc-950">
              Haftalık Fırsat
            </Text>
          </View>
          <Text className="mt-1.5 text-[12px] font-bold leading-snug text-white">
            Pastacılık Yağlarında 50 Koli Üzeri Alımlara Özel İskonto Fırsatı
          </Text>
          <View className="mt-2.5 flex-row items-center justify-between">
            <Text className="text-[10px] text-white/80">Net %4.5 Ekstra Fiyat Avantajı</Text>
            <Pressable
              onPress={() => navigation.navigate('Catalog')}
              className="rounded-lg bg-white px-2.5 py-1"
            >
              <Text className="text-[10px] font-bold text-[#536E27]">İncele</Text>
            </Pressable>
          </View>
        </View>

        {/* Frequently Ordered Items */}
        <View className="mt-4 space-y-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] font-black uppercase tracking-wider text-[#536E27]">
              Sık Alınan Ürünler
            </Text>
            <Pressable onPress={() => navigation.navigate('Catalog')}>
              <Text className="text-[10px] font-semibold text-zinc-500">Tümü (18)</Text>
            </Pressable>
          </View>

          {/* Item 1 */}
          <View className="mt-2 flex-row items-center justify-between rounded-xl border border-[#E2E8D4] bg-white p-2.5 shadow-sm">
            <View className="flex-row items-center gap-2.5">
              <View className="h-11 w-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
                <Ionicons name="cube-outline" size={20} color="#B45309" />
              </View>
              <View>
                <Text className="text-[12px] font-bold leading-tight text-zinc-900">
                  Baklava Unu (25 KG)
                </Text>
                <Text className="text-[9px] text-zinc-400">
                  Özel İpek Tip 550 • Çuval
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="font-mono text-[12px] font-black text-[#536E27]">
                ₺440.00
              </Text>
              <Pressable
                onPress={() => handleQuickAdd('SKU-992')}
                className="mt-1 flex-row items-center gap-1 rounded bg-[#8FBE1A]/20 px-2 py-0.5 active:bg-[#8FBE1A]/40"
              >
                <Ionicons name="add" size={11} color="#536E27" />
                <Text className="text-[9px] font-bold text-[#536E27]">Teklife Ekle</Text>
              </Pressable>
            </View>
          </View>

          {/* Item 2 */}
          <View className="mt-2 flex-row items-center justify-between rounded-xl border border-[#E2E8D4] bg-white p-2.5 shadow-sm">
            <View className="flex-row items-center gap-2.5">
              <View className="h-11 w-11 items-center justify-center rounded-xl border border-amber-300 bg-amber-100/60">
                <Ionicons name="layers-outline" size={20} color="#92400E" />
              </View>
              <View>
                <Text className="text-[12px] font-bold leading-tight text-zinc-900">
                  Pastacılık Margarini (10 KG)
                </Text>
                <Text className="text-[9px] text-zinc-400">
                  Blok Kruvasan & Milföy Yağı
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="font-mono text-[12px] font-black text-[#536E27]">
                ₺1,220.00
              </Text>
              <Pressable
                onPress={() => handleQuickAdd('SKU-418')}
                className="mt-1 flex-row items-center gap-1 rounded bg-[#8FBE1A]/20 px-2 py-0.5 active:bg-[#8FBE1A]/40"
              >
                <Ionicons name="add" size={11} color="#536E27" />
                <Text className="text-[9px] font-bold text-[#536E27]">Teklife Ekle</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
