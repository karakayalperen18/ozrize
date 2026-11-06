import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { CreditBanner } from '../components/CreditBanner';
import { EmptyState } from '../components/EmptyState';
import { ProductCard } from '../components/ProductCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ModalSheet } from '../components/ui/ModalSheet';
import { Stepper } from '../components/ui/Stepper';
import { useApp } from '../context/AppContext';
import { categoryMeta, palette, paymentTermMeta } from '../theme/tokens';
import type { PaymentTerm, Product, ProductCategory } from '../types/b2b';
import { money } from '../utils/format';
import { nextTier, resolveUnitPrice } from '../utils/pricing';

type SortMode = 'POPULAR' | 'PRICE_ASC' | 'PRICE_DESC';
type CategoryFilter = 'ALL' | ProductCategory;

const SORT_LABEL: Record<SortMode, string> = {
  POPULAR: 'Popüler',
  PRICE_ASC: 'Fiyat ↑',
  PRICE_DESC: 'Fiyat ↓',
};

const CATEGORY_ORDER: ProductCategory[] = ['FLOUR', 'FAT', 'CHOCOLATE', 'ADDITIVE', 'SWEETENER'];

export const CustomerCatalogScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const {
    products,
    addToCart,
    updateQuantity,
    setTargetPrice,
    setPaymentTerm,
    cartItems,
    totals,
    lineFor,
  } = useApp();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [sort, setSort] = useState<SortMode>('POPULAR');

  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [draftQuantity, setDraftQuantity] = useState(0);
  const [draftPrice, setDraftPrice] = useState('');
  const [draftTerm, setDraftTerm] = useState<PaymentTerm>('TERM_30');

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesCategory = category === 'ALL' || product.category === category;
      const matchesQuery =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });

    if (sort === 'PRICE_ASC') {
      return [...filtered].sort((a, b) => a.basePrice - b.basePrice);
    }
    if (sort === 'PRICE_DESC') {
      return [...filtered].sort((a, b) => b.basePrice - a.basePrice);
    }
    return filtered;
  }, [category, products, search, sort]);

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
    updateQuantity(activeProduct.id, draftQuantity);
    if (hasCustomPrice) {
      setTargetPrice(activeProduct.id, parsedPrice);
    }
    setPaymentTerm(draftTerm);
    setActiveProduct(null);
    navigation.navigate('QuoteBuilder');
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <AppHeader />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: cartItems.length > 0 ? 108 : 28 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-3 pt-2">
          <CreditBanner />
        </View>

        <View className="mt-2 px-3">
          <View className="flex-row items-center rounded-xl border border-brand-border bg-white px-3 py-2">
            <Ionicons name="search" size={14} color={palette.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Un, margarin, kakao veya ürün kodu ara..."
              placeholderTextColor="#94A3B8"
              className="ml-2 flex-1 text-[12px] font-semibold text-brand-text"
              returnKeyType="search"
              accessibilityLabel="Ürün ara"
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Aramayı temizle">
                <Ionicons name="close-circle" size={15} color={palette.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="mt-2 flex-row flex-wrap gap-1.5 px-3">
          <Pressable
            onPress={() => setCategory('ALL')}
            className={`rounded-full border px-3 py-1.5 ${
              category === 'ALL'
                ? 'border-brand-primary bg-brand-primary'
                : 'border-brand-border bg-white'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                category === 'ALL' ? 'text-white' : 'text-brand-muted'
              }`}
            >
              Tümü
            </Text>
          </Pressable>

          {CATEGORY_ORDER.map((item) => {
            const active = category === item;
            return (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                className={`rounded-full border px-3 py-1.5 ${
                  active ? 'border-brand-primary bg-brand-primary' : 'border-brand-border bg-white'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    active ? 'text-white' : 'text-brand-muted'
                  }`}
                >
                  {categoryMeta[item].label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-2 flex-row items-center justify-between px-3">
          <Text className="text-[10px] font-semibold text-brand-muted">
            {visibleProducts.length} ürün listeleniyor
          </Text>
          <Pressable
            onPress={() =>
              setSort((current) =>
                current === 'POPULAR'
                  ? 'PRICE_ASC'
                  : current === 'PRICE_ASC'
                    ? 'PRICE_DESC'
                    : 'POPULAR',
              )
            }
            className="flex-row items-center rounded-lg border border-brand-border bg-white px-2 py-1"
            accessibilityRole="button"
            accessibilityLabel="Sıralamayı değiştir"
          >
            <Ionicons name="swap-vertical" size={10} color={palette.primary} />
            <Text className="ml-1 text-[9px] font-bold text-brand-primary">
              {SORT_LABEL[sort]}
            </Text>
          </Pressable>
        </View>

        <View className="mt-2 gap-2 px-3">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantityInCart={lineFor(product.id)?.quantity ?? 0}
              onAdd={() => addToCart(product.id)}
              onRequestQuote={() => openQuoteModal(product)}
            />
          ))}

          {visibleProducts.length === 0 ? (
            <EmptyState
              icon="search"
              title="Ürün bulunamadı"
              description="Arama terimini veya kategori filtresini değiştirerek yeniden deneyin."
              actionLabel="Filtreleri temizle"
              onActionPress={() => {
                setSearch('');
                setCategory('ALL');
              }}
            />
          ) : null}
        </View>
      </ScrollView>

      {cartItems.length > 0 ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-brand-border bg-brand-dark px-3 pb-3 pt-2.5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[9px] text-white/70">
                {totals.itemCount} kalem • {totals.unitCount} birim
              </Text>
              <Text className="font-mono text-[13px] font-black text-white">
                {money(totals.requestedTotal, 0)}
                <Text className="text-[9px] font-semibold text-brand-accent"> + KDV</Text>
              </Text>
            </View>
            <Button
              label="Teklif Sepetine Git"
              icon="arrow-forward"
              size="sm"
              onPress={() => navigation.navigate('QuoteBuilder')}
            />
          </View>
        </View>
      ) : null}

      <ModalSheet
        visible={activeProduct !== null}
        onClose={closeQuoteModal}
        title="Özel Fiyat Teklifi İste"
        subtitle={activeProduct?.name}
        footer={
          <View className="flex-row">
            <Button
              label="Vazgeç"
              variant="outline"
              size="sm"
              onPress={closeQuoteModal}
              className="mr-2 flex-1"
            />
            <Button
              label="Teklife Ekle"
              icon="cart"
              size="sm"
              onPress={handleConfirmQuote}
              className="flex-[1.4]"
            />
          </View>
        }
      >
        {activeProduct ? (
          <View>
            <View className="flex-row items-center justify-between rounded-xl border border-brand-border bg-brand-bg p-2.5">
              <View>
                <Text className="font-mono text-[9px] text-brand-muted">{activeProduct.sku}</Text>
                <Text className="text-[11px] font-bold text-brand-text">
                  Liste fiyatı: {money(modalListPrice, 0)} / {activeProduct.unit}
                </Text>
              </View>
              <Badge
                label={`MOQ ${activeProduct.moq}`}
                className="bg-brand-primary border-brand-primary"
                textClassName="text-white"
              />
            </View>

            <View className="mt-3 items-center rounded-xl border border-brand-border p-2.5">
              <Text className="mb-1 text-[10px] font-bold text-brand-primary">Talep Miktarı</Text>
              <Stepper
                value={draftQuantity}
                min={activeProduct.moq}
                max={activeProduct.stockQuantity}
                step={activeProduct.unit === 'Kg' ? 5 : 1}
                onChange={setDraftQuantity}
                unit={activeProduct.unit}
              />
              <Text className="mt-1 text-[9px] text-brand-muted">
                {modalListPrice !== activeProduct.basePrice
                  ? `${draftQuantity}+ kademesi uygulanır`
                  : `${activeProduct.moq} birimden itibaren geçerli`}
                {modalNextTier
                  ? ` • ${modalNextTier.minQuantity} ${activeProduct.unit} için ${money(
                      modalNextTier.unitPrice,
                      0,
                    )}`
                  : ''}
              </Text>
            </View>

            <View className="mt-3">
              <Text className="mb-1 text-[10px] font-bold text-brand-primary">
                Hedef Birim Fiyat (₺) — opsiyonel
              </Text>
              <View className="flex-row items-center rounded-xl border border-brand-border bg-white px-3 py-2">
                <Text className="mr-1 text-[12px] font-bold text-brand-muted">₺</Text>
                <TextInput
                  value={draftPrice}
                  onChangeText={setDraftPrice}
                  keyboardType="decimal-pad"
                  placeholder={String(modalListPrice)}
                  placeholderTextColor="#94A3B8"
                  className="flex-1 text-[13px] font-bold text-brand-text"
                  accessibilityLabel="Hedef birim fiyat"
                />
                <Text className="text-[9px] text-brand-muted">/ {activeProduct.unit}</Text>
              </View>
              {hasCustomPrice && parsedPrice > modalListPrice ? (
                <Text className="mt-1 text-[9px] font-semibold text-amber-600">
                  Hedef fiyat liste fiyatının üzerinde — teklif yine de satış ekibine iletilir.
                </Text>
              ) : null}
            </View>

            <View className="mt-3">
              <Text className="mb-1 text-[10px] font-bold text-brand-primary">Ödeme Şekli</Text>
              <View className="flex-row gap-1.5">
                {(Object.keys(paymentTermMeta) as PaymentTerm[]).map((term) => {
                  const active = draftTerm === term;
                  return (
                    <Pressable
                      key={term}
                      onPress={() => setDraftTerm(term)}
                      className={`flex-1 rounded-lg border px-2 py-2 ${
                        active
                          ? 'border-brand-primary bg-brand-accent/15'
                          : 'border-brand-border bg-white'
                      }`}
                    >
                      <Text
                        className={`text-center text-[9px] font-bold ${
                          active ? 'text-brand-primary' : 'text-brand-muted'
                        }`}
                      >
                        {paymentTermMeta[term].shortLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="mt-3 rounded-xl border border-brand-supporting/40 bg-brand-accent/10 p-2.5">
              <Text className="text-[9px] leading-relaxed text-brand-primary">
                Bu ürün için hedef fiyatınız satış ekibine iletilir. Onay süreci ortalama 2 iş günü
                sürer; marj eşiğini karşılayan talepler otomatik onaylanır.
              </Text>
            </View>
          </View>
        ) : null}
      </ModalSheet>
    </SafeAreaView>
  );
};
