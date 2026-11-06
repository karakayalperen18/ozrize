import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ModalSheet } from '../components/ui/ModalSheet';
import { Stepper } from '../components/ui/Stepper';
import { useApp } from '../context/AppContext';
import { palette, paymentTermMeta } from '../theme/tokens';
import type { PaymentTerm, QuoteRequest } from '../types/b2b';
import { money, percent } from '../utils/format';
import { MARGIN_THRESHOLD_PCT, VAT_RATE, VAT_RATE_PCT, resolveTier } from '../utils/pricing';

export const QuoteBuilderScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const {
    cartItems,
    totals,
    creditCheck,
    credit,
    paymentTerm,
    setPaymentTerm,
    quoteNote,
    setQuoteNote,
    updateQuantity,
    removeFromCart,
    setTargetPrice,
    clearCart,
    submitQuote,
    products,
  } = useApp();

  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdQuote, setCreatedQuote] = useState<QuoteRequest | null>(null);

  useEffect(() => {
    setPriceDrafts((current) => {
      const next = { ...current };
      cartItems.forEach((item) => {
        if (next[item.productId] === undefined) {
          next[item.productId] = String(item.targetUnitPrice);
        }
      });
      return next;
    });
  }, [cartItems]);

  const isEmpty = cartItems.length === 0;
  const submitDisabled = isEmpty || creditCheck.exceeds;

  const vatEstimate = useMemo(() => totals.requestedTotal * VAT_RATE, [totals.requestedTotal]);

  const handlePriceChange = (productId: string, raw: string) => {
    setPriceDrafts((current) => ({ ...current, [productId]: raw }));
    const parsed = Number(raw.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) {
      setTargetPrice(productId, parsed);
    }
  };

  const handleSubmit = () => {
    const result = submitQuote();
    if (result.ok) {
      setSubmitError(null);
      setCreatedQuote(result.quote);
      setPriceDrafts({});
    } else {
      setSubmitError(result.message);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <AppHeader />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: isEmpty ? 28 : 132 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-3 pt-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[15px] font-black text-brand-text">Teklif Sepeti</Text>
              <Text className="text-[10px] text-brand-muted">
                Miktar, hedef fiyat ve ticari şartları belirleyin
              </Text>
            </View>
            {!isEmpty ? (
              <Pressable onPress={clearCart} hitSlop={8} accessibilityLabel="Sepeti temizle">
                <Text className="text-[9px] font-bold text-red-600">Temizle</Text>
              </Pressable>
            ) : null}
          </View>

          <View className="mt-2 flex-row items-center">
            {['Ürünler', 'Şartlar', 'Gönder'].map((step, index) => (
              <React.Fragment key={step}>
                <View className="flex-row items-center">
                  <View
                    className={`h-4 w-4 items-center justify-center rounded-full ${
                      index === 0 || !isEmpty ? 'bg-brand-primary' : 'bg-brand-border'
                    }`}
                  >
                    <Text className="text-[8px] font-black text-white">{index + 1}</Text>
                  </View>
                  <Text className="ml-1 text-[9px] font-semibold text-brand-muted">{step}</Text>
                </View>
                {index < 2 ? <View className="mx-2 h-[1px] flex-1 bg-brand-border" /> : null}
              </React.Fragment>
            ))}
          </View>
        </View>

        {isEmpty ? (
          <View className="mt-4 px-3">
            <EmptyState
              icon="cart-outline"
              title="Teklif sepetiniz boş"
              description="Katalogdan ürün ekleyerek toptan fiyat teklifi oluşturabilirsiniz."
              actionLabel="Kataloğa Git"
              onActionPress={() => navigation.navigate('Catalog')}
            />
          </View>
        ) : (
          <>
            <View className="mt-3 gap-2 px-3">
              {cartItems.map((item) => {
                const product = products.find((candidate) => candidate.id === item.productId);
                const tier = product ? resolveTier(product, item.quantity) : undefined;
                const draft = priceDrafts[item.productId] ?? String(item.targetUnitPrice);
                const deltaPct =
                  item.listUnitPrice > 0
                    ? ((item.targetUnitPrice - item.listUnitPrice) / item.listUnitPrice) * 100
                    : 0;
                const critical = item.marginPct < MARGIN_THRESHOLD_PCT;

                return (
                  <View
                    key={item.productId}
                    className="rounded-card border border-brand-border bg-white p-3"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        <Text className="text-[12px] font-black leading-tight text-brand-text">
                          {item.name}
                        </Text>
                        <Text className="mt-0.5 font-mono text-[9px] text-brand-muted">
                          {item.sku} • {item.unit}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => removeFromCart(item.productId)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Ürünü sepetten çıkar"
                        className="h-6 w-6 items-center justify-center rounded-full bg-red-50"
                      >
                        <Ionicons name="trash-outline" size={12} color={palette.danger} />
                      </Pressable>
                    </View>

                    <View className="mt-2 flex-row items-end justify-between">
                      <Stepper
                        value={item.quantity}
                        min={product?.moq ?? 1}
                        max={product?.stockQuantity ?? 9999}
                        step={item.unit === 'Kg' ? 5 : 1}
                        onChange={(next) => updateQuantity(item.productId, next)}
                        unit={item.unit}
                        compact
                      />

                      <View className="flex-1 pl-3">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-[9px] text-brand-muted">
                            Liste {money(item.listUnitPrice, 0)}
                            {tier ? ` • ${tier.minQuantity}+ kademe` : ''}
                          </Text>
                          {deltaPct !== 0 ? (
                            <Badge
                              label={`${deltaPct > 0 ? '+' : ''}${percent(deltaPct, 1)}`}
                              className={
                                deltaPct < 0
                                  ? 'bg-brand-accent/15 border-brand-accent/40'
                                  : 'bg-amber-50 border-amber-200'
                              }
                              textClassName={deltaPct < 0 ? 'text-brand-primary' : 'text-amber-700'}
                            />
                          ) : null}
                        </View>

                        <View className="mt-1 flex-row items-center rounded-lg border border-brand-border bg-brand-bg px-2 py-1">
                          <Text className="mr-1 text-[10px] font-bold text-brand-muted">₺</Text>
                          <TextInput
                            value={draft}
                            onChangeText={(raw) => handlePriceChange(item.productId, raw)}
                            keyboardType="decimal-pad"
                            className="flex-1 text-[12px] font-bold text-brand-text"
                            accessibilityLabel={`${item.name} hedef birim fiyat`}
                          />
                          <Text className="text-[8px] text-brand-muted">hedef / {item.unit}</Text>
                        </View>
                      </View>
                    </View>

                    <View className="mt-2 flex-row items-center justify-between border-t border-brand-border pt-1.5">
                      <Text className="text-[9px] text-brand-muted">
                        {item.quantity} {item.unit} × {money(item.targetUnitPrice, 0)}
                      </Text>
                      <View className="flex-row items-center">
                        {critical ? (
                          <Badge
                            label="Marj düşük"
                            className="mr-1.5 border-red-200 bg-red-50"
                            textClassName="text-red-700"
                          />
                        ) : null}
                        <Text className="font-mono text-[12px] font-black text-brand-primary">
                          {money(item.requestedTotal, 0)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="mt-3 px-3">
              <Text className="text-[11px] font-black uppercase tracking-label text-brand-primary">
                Ticari Şartlar
              </Text>
              <View className="mt-1.5 gap-1.5">
                {(Object.keys(paymentTermMeta) as PaymentTerm[]).map((term) => {
                  const active = paymentTerm === term;
                  const meta = paymentTermMeta[term];
                  return (
                    <Pressable
                      key={term}
                      onPress={() => setPaymentTerm(term)}
                      className={`flex-row items-center rounded-xl border px-3 py-2 ${
                        active
                          ? 'border-brand-primary bg-brand-accent/10'
                          : 'border-brand-border bg-white'
                      }`}
                    >
                      <View
                        className={`h-3.5 w-3.5 items-center justify-center rounded-full border ${
                          active ? 'border-brand-primary bg-brand-primary' : 'border-brand-border'
                        }`}
                      >
                        {active ? <View className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                      </View>
                      <View className="ml-2 flex-1">
                        <Text className="text-[11px] font-bold text-brand-text">{meta.label}</Text>
                        <Text className="text-[9px] text-brand-muted">{meta.description}</Text>
                      </View>
                      {active ? (
                        <Badge
                          label="Seçili"
                          className="border-brand-supporting bg-brand-accent/20"
                          textClassName="text-brand-primary"
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="mt-3 px-3">
              <Text className="text-[11px] font-black uppercase tracking-label text-brand-primary">
                Satış Ekibine Not
              </Text>
              <TextInput
                value={quoteNote}
                onChangeText={setQuoteNote}
                placeholder="Aylık alım taahhüdü, sevkiyat tercihi veya fiyat gerekçesi..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                className="mt-1.5 min-h-[64px] rounded-xl border border-brand-border bg-white px-3 py-2 text-[11px] text-brand-text"
                textAlignVertical="top"
                accessibilityLabel="Satış ekibine not"
              />
            </View>

            <View className="mt-3 px-3">
              <View className="rounded-card border border-brand-border bg-white p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[10px] text-brand-muted">Liste toplamı</Text>
                  <Text className="font-mono text-[10px] text-brand-muted">
                    {money(totals.listTotal, 0)}
                  </Text>
                </View>
                <View className="mt-1 flex-row items-center justify-between">
                  <Text className="text-[10px] text-brand-muted">Hedef toplam</Text>
                  <Text className="font-mono text-[11px] font-bold text-brand-text">
                    {money(totals.requestedTotal, 0)}
                  </Text>
                </View>
                <View className="mt-1 flex-row items-center justify-between">
                  <Text className="text-[10px] text-brand-muted">Tahmini KDV (%{VAT_RATE_PCT})</Text>
                  <Text className="font-mono text-[10px] text-brand-muted">
                    {money(vatEstimate, 0)}
                  </Text>
                </View>
                {totals.savings > 0 ? (
                  <View className="mt-1 flex-row items-center justify-between">
                    <Text className="text-[10px] text-brand-primary">Talep edilen indirim</Text>
                    <Text className="font-mono text-[10px] font-bold text-brand-primary">
                      -{money(totals.savings, 0)}
                    </Text>
                  </View>
                ) : null}

                <View className="mt-2 flex-row items-center justify-between border-t border-brand-border pt-2">
                  <Text className="text-[11px] font-black text-brand-text">
                    Genel Toplam
                  </Text>
                  <Text className="font-mono text-[15px] font-black text-brand-primary">
                    {money(totals.requestedTotal, 0)}
                  </Text>
                </View>
                <Text className="mt-0.5 text-right text-[8px] text-brand-muted">
                  {totals.unitCount} birim • {totals.itemCount} kalem • KDV hariç
                </Text>
              </View>
            </View>

            <View className="mt-2 px-3">
              <View
                className={`rounded-xl border px-3 py-2 ${
                  creditCheck.exceeds
                    ? 'border-red-200 bg-red-50'
                    : 'border-brand-supporting/40 bg-brand-accent/10'
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name={creditCheck.exceeds ? 'alert-circle' : 'shield-checkmark'}
                    size={12}
                    color={creditCheck.exceeds ? palette.danger : palette.primary}
                  />
                  <Text
                    className={`ml-1.5 flex-1 text-[9px] font-semibold ${
                      creditCheck.exceeds ? 'text-red-700' : 'text-brand-primary'
                    }`}
                  >
                    {creditCheck.exceeds
                      ? `Kredi limiti aşılıyor: ${money(creditCheck.overflow, 0)} fazla. Teklif gönderilemez.`
                      : `Limit kontrolü tamam: ${money(
                          credit.limit - creditCheck.projectedExposure,
                          0,
                        )} kullanılabilir limit kalır.`}
                  </Text>
                </View>
              </View>
            </View>

            {submitError ? (
              <View className="mt-2 px-3">
                <View className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <Text className="text-[9px] font-semibold text-red-700">{submitError}</Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {!isEmpty ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-brand-border bg-brand-dark px-3 pb-3 pt-2.5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[9px] text-white/70">Net toplam</Text>
              <Text className="font-mono text-[15px] font-black text-white">
                {money(totals.requestedTotal, 0)}
              </Text>
            </View>
            <Button
              label="Teklif Talebini Gönder"
              icon="paper-plane"
              size="sm"
              onPress={handleSubmit}
              disabled={submitDisabled}
            />
          </View>
        </View>
      ) : null}

      <ModalSheet
        visible={createdQuote !== null}
        onClose={() => setCreatedQuote(null)}
        title={createdQuote?.autoApproved ? 'Teklif otomatik onaylandı' : 'Teklif talebi alındı'}
        subtitle={createdQuote ? `${createdQuote.code} • ${money(createdQuote.totalRequested, 0)}` : undefined}
        footer={
          <View className="flex-row">
            <Button
              label="Kataloğa Dön"
              variant="outline"
              size="sm"
              onPress={() => {
                setCreatedQuote(null);
                navigation.navigate('Catalog');
              }}
              className="mr-2 flex-1"
            />
            <Button
              label="Cari Hesabım"
              size="sm"
              onPress={() => {
                setCreatedQuote(null);
                navigation.navigate('Ledger');
              }}
              className="flex-1"
            />
          </View>
        }
      >
        {createdQuote ? (
          <View>
            <View className="items-center rounded-xl border border-brand-border bg-brand-bg p-3">
              <Ionicons
                name={createdQuote.autoApproved ? 'checkmark-circle' : 'time'}
                size={30}
                color={createdQuote.autoApproved ? palette.supporting : palette.warning}
              />
              <Text className="mt-1 text-center text-[11px] font-bold text-brand-text">
                {createdQuote.autoApproved
                  ? 'Talebiniz marj eşiği üzerinde olduğu için otomatik onaylandı.'
                  : 'Talebiniz satış ekibinin onayına gönderildi.'}
              </Text>
              <Text className="mt-1 text-center text-[9px] text-brand-muted">
                {createdQuote.items.length} kalem • {paymentTermMeta[createdQuote.paymentTerm].label} •{' '}
                net marj {percent(createdQuote.marginPct, 2)}
              </Text>
            </View>

            <View className="mt-2 rounded-xl border border-brand-border px-3 py-2">
              {createdQuote.items.map((item) => (
                <View key={item.id} className="flex-row items-center justify-between py-0.5">
                  <Text className="flex-1 pr-2 text-[10px] text-brand-text" numberOfLines={1}>
                    {item.quantity} {item.unit} {item.name}
                  </Text>
                  <Text className="font-mono text-[10px] font-bold text-brand-text">
                    {money(item.requestedTotal, 0)}
                  </Text>
                </View>
              ))}
            </View>

            <Text className="mt-2 text-center text-[9px] text-brand-muted">
              Takip numaranız {createdQuote.code}. Durum değişikliklerinde bildirim gönderilir.
            </Text>
          </View>
        ) : null}
      </ModalSheet>
    </SafeAreaView>
  );
};
