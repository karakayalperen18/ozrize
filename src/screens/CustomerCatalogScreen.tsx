import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModalSheet } from '../components/ui/ModalSheet';
import { Stepper } from '../components/ui/Stepper';
import { useApp } from '../context/AppContext';
import { palette, paymentTermMeta } from '../theme/tokens';
import type { PaymentTerm, Product, ProductCategory } from '../types/b2b';
import { money } from '../utils/format';
import { nextTier, resolveUnitPrice } from '../utils/pricing';

type CategoryFilter = 'ALL' | ProductCategory;

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'ALL', label: 'Tüm Ürünler' },
  { id: 'FLOUR', label: 'Un & Nişasta' },
  { id: 'FAT', label: 'Yağlar & Margarin' },
  { id: 'CHOCOLATE', label: 'Çikolata & Kakao' },
  { id: 'ADDITIVE', label: 'Katkı & Maya' },
];

export const CustomerCatalogScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const {
    products,
    addToCart,
    setTargetPrice,
    cartItems,
    totals,
    lineFor,
  } = useApp();

  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [draftQuantity, setDraftQuantity] = useState(0);
  const [draftPrice, setDraftPrice] = useState('');
  const [draftTerm, setDraftTerm] = useState<PaymentTerm>('TERM_30');

  const visibleProducts = useMemo(() => {
    if (category === 'ALL') return products;
    return products.filter((p) => p.category === category);
  }, [category, products]);

  const openQuoteModal = (product: Product) => {
    const inCart = lineFor(product.id);
    setActiveProduct(product);
    setDraftQuantity(inCart?.quantity ?? product.moq);
    setDraftPrice(inCart?.targetUnitPrice ? String(inCart.targetUnitPrice) : '');
    setDraftTerm('TERM_30');
  };

  const closeQuoteModal = () => setActiveProduct(null);

  const modalListPrice = activeProduct
    ? resolveUnitPrice(activeProduct, draftQuantity)
    : 0;
  const modalNextTier = activeProduct ? nextTier(activeProduct, draftQuantity) : undefined;
  const parsedPrice = Number(draftPrice.replace(',', '.'));
  const hasCustomPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;

  const handleConfirmQuote = () => {
    if (!activeProduct) return;
    addToCart(activeProduct.id, draftQuantity);
    if (hasCustomPrice) {
      setTargetPrice(activeProduct.id, parsedPrice);
    }
    closeQuoteModal();
  };

  const getProductIcon = (cat: ProductCategory) => {
    switch (cat) {
      case 'FLOUR':
        return 'cube-outline';
      case 'FAT':
        return 'layers-outline';
      case 'CHOCOLATE':
        return 'nutrition-outline';
      default:
        return 'basket-outline';
    }
  };

  const totalUnits = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#536E27]">
      {/* Top Header */}
      <View className="bg-[#536E27] px-4 py-2.5 shadow-md flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => navigation.goBack()}
            className="h-8 w-8 items-center justify-center rounded-full bg-black/20"
          >
            <Ionicons name="arrow-back" size={17} color="#FFFFFF" />
          </Pressable>
          <Text className="text-[13px] font-black tracking-tight text-white">
            Toptan Ürün Kataloğu
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-[#8FBE1A] px-2 py-0.5">
            <Text className="text-[10px] font-black text-zinc-950">
              {visibleProducts.length} Ürün
            </Text>
          </View>
          <Pressable
            onPress={() => Alert.alert('Filtreler', 'Kategoriye ve stok durumuna göre filtreleniyor.')}
            className="h-8 w-8 items-center justify-center rounded-full bg-black/20"
          >
            <Ionicons name="options-outline" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Category Pills Bar */}
      <View className="bg-white border-b border-zinc-200 px-3 py-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                className={`rounded-full px-3 py-1 ${
                  active ? 'bg-[#536E27]' : 'bg-zinc-100'
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    active ? 'text-white' : 'text-zinc-600'
                  }`}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Sub Filter Banner */}
      <View className="bg-[#EEF2E6] px-4 py-1.5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          <Ionicons name="checkmark-done" size={13} color="#77AA2B" />
          <Text className="text-[10px] font-bold text-[#536E27]">
            Sadece Anlaşmalı Ürünler
          </Text>
        </View>
        <Text className="text-[10px] text-zinc-500 font-medium">Sıralama: Popüler</Text>
      </View>

      {/* Product List */}
      <ScrollView
        className="flex-1 bg-[#F7F9F4]"
        contentContainerStyle={{ padding: 12, paddingBottom: cartItems.length > 0 ? 110 : 30 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="space-y-2.5">
          {visibleProducts.map((product) => {
            const inCart = lineFor(product.id);
            const unit = product.unit;

            return (
              <View
                key={product.id}
                className="rounded-2xl border border-[#E2E8D4] bg-white p-3 shadow-sm mb-2.5 space-y-2"
              >
                <View className="flex-row gap-3">
                  {/* Thumbnail / Package Icon */}
                  <View className="h-16 w-16 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-1 flex-shrink-0">
                    <Ionicons
                      name={getProductIcon(product.category)}
                      size={24}
                      color="#B45309"
                    />
                    <View className="mt-0.5 rounded bg-amber-200/90 px-1">
                      <Text className="text-[8px] font-extrabold text-amber-900">
                        {unit}
                      </Text>
                    </View>
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <View className="flex-row items-start justify-between">
                      <Text className="text-[12px] font-bold leading-tight text-zinc-900 flex-1 pr-1">
                        {product.name}
                      </Text>
                      <View className="rounded bg-[#77AA2B]/10 px-1.5 py-0.5">
                        <Text className="text-[9px] font-bold text-[#536E27]">
                          {product.sku}
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-0.5 text-[10px] text-zinc-500" numberOfLines={1}>
                      {product.description}
                    </Text>
                    <View className="mt-1.5 flex-row items-center gap-1.5">
                      <View className="rounded bg-zinc-100 px-1.5 py-0.5">
                        <Text className="text-[9px] font-medium text-zinc-600">
                          B2B MOQ: Min. {product.moq} {unit}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Bottom Row */}
                <View className="flex-row items-center justify-between border-t border-zinc-100 pt-2">
                  <View>
                    <Text className="text-[9px] text-zinc-400">Anlaşmalı Liste Fiyatı</Text>
                    <Text className="font-mono text-[13px] font-black text-zinc-900">
                      {money(product.basePrice, 0)}{' '}
                      <Text className="text-[9px] font-normal text-zinc-400">/ {unit}</Text>
                    </Text>
                  </View>

                  {inCart ? (
                    <Pressable
                      onPress={() => openQuoteModal(product)}
                      className="flex-row items-center gap-1 rounded-xl bg-[#536E27] px-3 py-1.5 shadow-sm active:bg-[#3F541E]"
                    >
                      <Ionicons name="checkmark" size={13} color="#8FBE1A" />
                      <Text className="text-[10px] font-bold text-white">
                        Eklendi ({inCart.quantity})
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => openQuoteModal(product)}
                      className="flex-row items-center gap-1 rounded-xl bg-[#8FBE1A] px-3.5 py-1.5 shadow-sm active:bg-[#7ea717]"
                    >
                      <Ionicons name="add" size={12} color="#0e1406" />
                      <Text className="text-[10px] font-black text-zinc-950">
                        Teklife Ekle
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Sticky Action Bar */}
      {cartItems.length > 0 ? (
        <View className="absolute bottom-2 left-3 right-3 flex-row items-center justify-between rounded-2xl border border-[#3B4E1F] bg-[#243112] p-2.5 shadow-2xl z-30">
          <View className="flex-row items-center gap-2.5">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-[#8FBE1A]">
              <Text className="text-[11px] font-black text-zinc-950">
                {cartItems.length}
              </Text>
            </View>
            <View>
              <Text className="text-[11px] font-bold leading-none text-white">
                {cartItems.length} Kalem Seçildi
              </Text>
              <Text className="text-[9px] text-zinc-300">
                Tahmini Hacim: {totalUnits} Birim
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => navigation.navigate('QuoteBuilder')}
            className="flex-row items-center gap-1.5 rounded-xl bg-[#8FBE1A] px-3.5 py-2 shadow-sm active:bg-[#7ea717]"
          >
            <Text className="text-[10px] font-black text-zinc-950">
              Teklif Sepetine Git
            </Text>
            <Ionicons name="arrow-forward" size={12} color="#0e1406" />
          </Pressable>
        </View>
      ) : null}

      {/* Add / Edit Modal Sheet */}
      <ModalSheet
        visible={activeProduct !== null}
        onClose={closeQuoteModal}
        title={activeProduct ? activeProduct.name : 'Teklif Detayı'}
        subtitle={activeProduct ? `${activeProduct.sku} • Liste Fiyatı: ${money(activeProduct.basePrice, 0)}` : ''}
        footer={
          <Pressable
            onPress={handleConfirmQuote}
            className="items-center justify-center rounded-xl bg-[#8FBE1A] py-2.5 active:bg-[#7ea717]"
          >
            <Text className="text-[12px] font-black text-zinc-950">
              {lineFor(activeProduct?.id ?? '') ? 'Güncelle' : 'Sepete Ekle'}
            </Text>
          </Pressable>
        }
      >
        {activeProduct ? (
          <View className="space-y-3">
            <View className="items-center rounded-xl border border-brand-border p-2.5">
              <Text className="mb-1 text-[10px] font-bold text-[#536E27]">Talep Miktarı</Text>
              <Stepper
                value={draftQuantity}
                min={activeProduct.moq}
                max={activeProduct.stockQuantity}
                step={activeProduct.unit === 'Kg' ? 5 : 1}
                onChange={setDraftQuantity}
                unit={activeProduct.unit}
              />
              <Text className="mt-1 text-[9px] text-zinc-500">
                {modalListPrice !== activeProduct.basePrice
                  ? `${draftQuantity}+ kademesi uygulanır`
                  : `${activeProduct.moq} birimden itibaren geçerli`}
                {modalNextTier
                  ? ` • ${modalNextTier.minQuantity} ${activeProduct.unit} için ${money(modalNextTier.unitPrice, 0)}`
                  : ''}
              </Text>
            </View>

            <View className="mt-2.5">
              <Text className="mb-1 text-[10px] font-bold text-[#536E27]">
                Hedef Birim Fiyat (₺) — opsiyonel
              </Text>
              <View className="flex-row items-center rounded-xl border border-zinc-200 bg-white px-3 py-2">
                <Text className="mr-1 text-[12px] font-bold text-zinc-400">₺</Text>
                <TextInput
                  value={draftPrice}
                  onChangeText={setDraftPrice}
                  keyboardType="decimal-pad"
                  placeholder={String(modalListPrice)}
                  placeholderTextColor="#94A3B8"
                  className="flex-1 font-mono text-[13px] font-bold text-zinc-900"
                />
                <Text className="text-[9px] text-zinc-400">/ {activeProduct.unit}</Text>
              </View>
            </View>
          </View>
        ) : null}
      </ModalSheet>
    </SafeAreaView>
  );
};
