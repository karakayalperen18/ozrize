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
import type { PaymentTerm } from '../types/b2b';
import { money } from '../utils/format';

export const QuoteBuilderScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const {
    cartItems,
    totals,
    updateQuantity,
    setTargetPrice,
    removeFromCart,
    clearCart,
    submitQuote,
    paymentTerm,
    setPaymentTerm,
    quoteNote,
    setQuoteNote,
  } = useApp();

  const [logisticsChoice, setLogisticsChoice] = useState<'FRIGO' | 'PICKUP'>('FRIGO');
  const [submitting, setSubmitting] = useState(false);

  const totalUnits = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handlePriceChange = (productId: string, rawText: string) => {
    const val = Number(rawText.replace(',', '.'));
    if (Number.isFinite(val) && val > 0) {
      setTargetPrice(productId, val);
    }
  };

  const handleSendQuote = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Sepet Boş', 'Lütfen en az bir ürün ekleyin.');
      return;
    }
    setSubmitting(true);
    const res = await submitQuote();
    setSubmitting(false);

    if (res.ok) {
      Alert.alert(
        'Teklif Talebi İletildi',
        'Teklif talebiniz başarıyla oluşturuldu ve değerlendirmeye alındı. Pazarlık ekranından süreci takip edebilirsiniz.',
        [
          {
            text: 'Pazarlık Ekranına Git',
            onPress: () => navigation.navigate('Negotiation'),
          },
        ],
      );
    } else {
      Alert.alert('Hata', res.message || 'Teklif oluşturulamadı.');
    }
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
            Teklif Sepeti Hazırla
          </Text>
          <Text className="text-[9px] text-white/80">
            Miktar ve Hedef Fiyat Belirleme
          </Text>
        </View>
        <Pressable
          onPress={() => {
            if (cartItems.length > 0) {
              Alert.alert('Sepeti Temizle', 'Tüm ürünler sepetten kaldırılsın mı?', [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Temizle', style: 'destructive', onPress: clearCart },
              ]);
            }
          }}
          className="h-8 w-8 items-center justify-center rounded-full bg-black/20"
        >
          <Ionicons name="trash-outline" size={16} color="#FCA5A5" />
        </Pressable>
      </View>

      {/* 3-Step Stepper */}
      <View className="bg-white px-6 py-2.5 border-b border-zinc-200 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <View className="h-5 w-5 items-center justify-center rounded-full bg-[#536E27]">
            <Text className="text-[10px] font-bold text-white">1</Text>
          </View>
          <Text className="text-[11px] font-bold text-[#536E27]">Ürünler</Text>
        </View>
        <Text className="text-zinc-300 font-bold">———</Text>
        <View className="flex-row items-center gap-1.5">
          <View className="h-5 w-5 items-center justify-center rounded-full bg-[#536E27]">
            <Text className="text-[10px] font-bold text-white">2</Text>
          </View>
          <Text className="text-[11px] font-bold text-[#536E27]">Şartlar</Text>
        </View>
        <Text className="text-zinc-300 font-bold">———</Text>
        <View className="flex-row items-center gap-1.5">
          <View className="h-5 w-5 items-center justify-center rounded-full bg-zinc-200">
            <Text className="text-[10px] font-bold text-zinc-600">3</Text>
          </View>
          <Text className="text-[11px] font-semibold text-zinc-400">Gönder</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 bg-[#F7F9F4]"
        contentContainerStyle={{ padding: 12, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {cartItems.length === 0 ? (
          <View className="items-center justify-center py-16">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <Ionicons name="receipt-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="mt-3 text-[14px] font-bold text-zinc-700">
              Sepetinizde Henüz Ürün Yok
            </Text>
            <Text className="mt-1 text-[11px] text-zinc-400">
              Katalogdan toptan ürün ekleyip hedef fiyat belirleyebilirsiniz.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Catalog')}
              className="mt-4 rounded-xl bg-[#536E27] px-4 py-2"
            >
              <Text className="text-[11px] font-bold text-white">Kataloğa Git</Text>
            </Pressable>
          </View>
        ) : (
          <View className="space-y-3">
            {/* Cart Items */}
            {cartItems.map((item) => (
              <View
                key={item.productId}
                className="rounded-2xl border border-[#E2E8D4] bg-white p-3 shadow-sm mb-3 space-y-2.5"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-[12px] font-bold text-zinc-900 leading-tight">
                      {item.name}
                    </Text>
                    <Text className="text-[10px] text-zinc-500">
                      {item.unit} Ambalaj • Liste: {money(item.listUnitPrice, 0)}
                    </Text>
                  </View>

                  {/* Stepper */}
                  <View className="flex-row items-center gap-2 rounded-lg border border-zinc-200 bg-[#F7F9F4] px-2 py-1">
                    <Pressable
                      onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="px-1"
                    >
                      <Text className="text-xs font-bold text-zinc-600">-</Text>
                    </Pressable>
                    <Text className="font-mono text-xs font-black text-zinc-900">
                      {item.quantity}
                    </Text>
                    <Pressable
                      onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="px-1"
                    >
                      <Text className="text-xs font-bold text-zinc-600">+</Text>
                    </Pressable>
                    <Text className="text-[10px] text-zinc-400">{item.unit}</Text>
                  </View>
                </View>

                {/* Target Price Box */}
                <View className="flex-row items-center justify-between rounded-xl border border-[#CCD8B8] bg-[#F3F7EC] p-2">
                  <Text className="text-[10px] font-bold text-[#536E27]">
                    Hedef Birim Fiyatınız:
                  </Text>
                  <View className="w-28 flex-row items-center rounded-lg border border-zinc-300 bg-white px-2 py-1">
                    <Text className="mr-1 text-[11px] font-bold text-zinc-400">₺</Text>
                    <TextInput
                      defaultValue={String(item.targetUnitPrice)}
                      onChangeText={(txt) => handlePriceChange(item.productId, txt)}
                      keyboardType="decimal-pad"
                      className="flex-1 font-mono text-[12px] font-black text-zinc-900"
                    />
                  </View>
                </View>
              </View>
            ))}

            {/* Commercial Conditions Card */}
            <View className="rounded-2xl border border-[#E2E8D4] bg-white p-3.5 shadow-sm space-y-3 mt-1">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="hand-left-outline" size={16} color="#77AA2B" />
                <Text className="text-[12px] font-black uppercase tracking-wider text-[#536E27]">
                  Ticari Şartlar & Sevkiyat
                </Text>
              </View>

              {/* Payment Method Selector */}
              <View>
                <Text className="mb-1 text-[10px] font-bold text-zinc-600">
                  Ödeme Yöntemi
                </Text>
                <View className="rounded-xl border border-zinc-200 bg-[#F7F9F4] p-1 space-y-1">
                  {[
                    { id: 'TERM_45' as PaymentTerm, label: 'DBS - 45 Gün Vadeli (Doğrudan Borçlandırma)' },
                    { id: 'CASH' as PaymentTerm, label: 'Kredi Kartı Tek Çekim Peşin (%2 İskonto)' },
                    { id: 'TERM_60' as PaymentTerm, label: 'Vadeli Kurumsal Çek (60 Gün)' },
                  ].map((term) => {
                    const active = paymentTerm === term.id;
                    return (
                      <Pressable
                        key={term.id}
                        onPress={() => setPaymentTerm(term.id)}
                        className={`rounded-lg px-2.5 py-1.5 ${
                          active ? 'bg-[#536E27]' : 'bg-transparent'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-semibold ${
                            active ? 'text-white' : 'text-zinc-700'
                          }`}
                        >
                          {term.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Logistics Selector */}
              <View>
                <Text className="mb-1 text-[10px] font-bold text-zinc-600">
                  Lojistik Tercihi
                </Text>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => setLogisticsChoice('FRIGO')}
                    className={`flex-1 rounded-xl border p-2 ${
                      logisticsChoice === 'FRIGO'
                        ? 'border-[#536E27] bg-[#536E27]/10'
                        : 'border-zinc-200 bg-[#F7F9F4]'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        logisticsChoice === 'FRIGO' ? 'text-[#536E27]' : 'text-zinc-600'
                      }`}
                    >
                      Frigorifik Soğuk Araç
                    </Text>
                    <Text className="text-[9px] text-zinc-400">Adrese Teslimat</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setLogisticsChoice('PICKUP')}
                    className={`flex-1 rounded-xl border p-2 ${
                      logisticsChoice === 'PICKUP'
                        ? 'border-[#536E27] bg-[#536E27]/10'
                        : 'border-zinc-200 bg-[#F7F9F4]'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        logisticsChoice === 'PICKUP' ? 'text-[#536E27]' : 'text-zinc-600'
                      }`}
                    >
                      Depodan Teslim
                    </Text>
                    <Text className="text-[9px] text-zinc-400">Müşteri Aracıyla</Text>
                  </Pressable>
                </View>
              </View>

              {/* Customer Note */}
              <View>
                <Text className="mb-1 text-[10px] font-bold text-zinc-600">
                  Talebe Özel Not
                </Text>
                <TextInput
                  value={quoteNote}
                  onChangeText={setQuoteNote}
                  placeholder="Hafta sonu sevkiyatı ve paletli rampa yüklemesi ricasıyla..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={2}
                  className="rounded-xl border border-zinc-200 bg-[#F7F9F4] p-2 text-[11px] text-zinc-800"
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom CTA */}
      {cartItems.length > 0 ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-[#3B4D20] bg-[#253213] p-3 shadow-2xl">
          <View className="mb-2 flex-row items-center justify-between text-[11px]">
            <Text className="text-[11px] text-zinc-300">
              Hedef Toplam: <Text className="font-bold text-white">{totalUnits} Birim</Text>
            </Text>
            <Text className="font-mono text-[13px] font-extrabold text-white">
              {money(totals.requestedTotal, 0)}{' '}
              <Text className="text-[9px] text-[#8FBE1A]">+ KDV</Text>
            </Text>
          </View>
          <Pressable
            onPress={handleSendQuote}
            disabled={submitting}
            className="flex-row items-center justify-center gap-1.5 rounded-xl bg-[#8FBE1A] py-3 active:bg-[#7ea717]"
          >
            <Ionicons name="paper-plane-outline" size={15} color="#0e1406" />
            <Text className="text-[12px] font-black text-zinc-950">
              Teklif Talebini Gönder
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
};
