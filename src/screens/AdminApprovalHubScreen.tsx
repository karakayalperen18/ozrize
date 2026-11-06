import { Ionicons } from '@expo/vector-icons';
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
import { QuoteCard } from '../components/QuoteCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ModalSheet } from '../components/ui/ModalSheet';
import { useApp } from '../context/AppContext';
import { palette, paymentTermMeta } from '../theme/tokens';
import type { PaymentTerm, QuoteRequest } from '../types/b2b';
import { money, percent } from '../utils/format';
import { MARGIN_THRESHOLD_PCT } from '../utils/pricing';

type QueueTab = 'PENDING' | 'COUNTERED' | 'CLOSED';

const TAB_LABEL: Record<QueueTab, string> = {
  PENDING: 'Onay Bekleyenler',
  COUNTERED: 'Karşı Teklifler',
  CLOSED: 'Sonuçlananlar',
};

export const AdminApprovalHubScreen: React.FC = () => {
  const { quotes, approveQuote, rejectQuote, sendCounterOffer, resetDemo } = useApp();

  const [tab, setTab] = useState<QueueTab>('PENDING');
  const [feedback, setFeedback] = useState<string | null>(null);

  const [discountTarget, setDiscountTarget] = useState<QuoteRequest | null>(null);
  const [discountPct, setDiscountPct] = useState('5');

  const [actionTarget, setActionTarget] = useState<QuoteRequest | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterTerm, setCounterTerm] = useState<PaymentTerm>('TERM_30');
  const [counterNote, setCounterNote] = useState('');

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 2600);
    return () => clearTimeout(timer);
  }, [feedback]);

  const pending = useMemo(() => quotes.filter((quote) => quote.status === 'PENDING'), [quotes]);
  const countered = useMemo(() => quotes.filter((quote) => quote.status === 'COUNTERED'), [quotes]);
  const closed = useMemo(
    () => quotes.filter((quote) => quote.status === 'APPROVED' || quote.status === 'REJECTED'),
    [quotes],
  );

  const visible = tab === 'PENDING' ? pending : tab === 'COUNTERED' ? countered : closed;

  const queueValue = pending.reduce((sum, quote) => sum + quote.totalRequested, 0);
  const avgMargin =
    pending.length > 0
      ? pending.reduce((sum, quote) => sum + quote.marginPct, 0) / pending.length
      : 0;
  const criticalCount = pending.filter((quote) => quote.marginPct < MARGIN_THRESHOLD_PCT).length;

  const openDiscount = (quote: QuoteRequest) => {
    setDiscountTarget(quote);
    setDiscountPct('5');
  };

  const openActions = (quote: QuoteRequest) => {
    const firstItem = quote.items[0];
    setActionTarget(quote);
    setCounterPrice(firstItem ? String(firstItem.targetUnitPrice) : '');
    setCounterTerm(quote.paymentTerm);
    setCounterNote('');
  };

  const applyDiscount = () => {
    if (!discountTarget) return;
    const parsed = Number(discountPct.replace(',', '.'));
    const safePct = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 40) : 0;

    approveQuote(discountTarget.id, safePct);
    setFeedback(`${discountTarget.code} %${safePct} iskonto ile onaylandı.`);
    setDiscountTarget(null);
  };

  const submitCounter = () => {
    if (!actionTarget) return;
    const parsed = Number(counterPrice.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFeedback('Geçerli bir birim fiyat girin.');
      return;
    }

    sendCounterOffer(actionTarget.id, {
      unitPrice: parsed,
      paymentTerm: counterTerm,
      note: counterNote,
    });
    setFeedback(`${actionTarget.code} için karşı teklif gönderildi.`);
    setActionTarget(null);
  };

  const submitReject = () => {
    if (!actionTarget) return;
    rejectQuote(actionTarget.id, counterNote || 'Talep reddedildi.');
    setFeedback(`${actionTarget.code} reddedildi.`);
    setActionTarget(null);
  };

  const handleApprove = (quote: QuoteRequest) => {
    approveQuote(quote.id);
    setFeedback(`${quote.code} onaylandı ve siparişe dönüştürüldü.`);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <AppHeader />

      <View className="border-b border-brand-border bg-white px-3">
        <View className="flex-row items-center justify-between">
          {(Object.keys(TAB_LABEL) as QueueTab[]).map((key) => {
            const count = key === 'PENDING' ? pending.length : key === 'COUNTERED' ? countered.length : closed.length;
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                className={`flex-1 items-center border-b-2 py-2 ${
                  active ? 'border-brand-primary' : 'border-transparent'
                }`}
              >
                <Text
                  className={`text-[9px] font-bold ${active ? 'text-brand-primary' : 'text-brand-muted'}`}
                  numberOfLines={1}
                >
                  {TAB_LABEL[key]}
                </Text>
                <Text
                  className={`text-[9px] font-black ${active ? 'text-brand-primary' : 'text-brand-muted'}`}
                >
                  ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {feedback ? (
          <View className="mx-3 mt-2 flex-row items-center rounded-xl border border-brand-supporting/50 bg-brand-accent/15 px-3 py-2">
            <Ionicons name="checkmark-circle" size={12} color={palette.primary} />
            <Text className="ml-1.5 flex-1 text-[9px] font-bold text-brand-primary">{feedback}</Text>
          </View>
        ) : null}

        <View className="mx-3 mt-2 rounded-card border border-brand-border bg-white p-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[9px] font-bold uppercase tracking-label text-brand-muted">
                Kuyruk Değeri
              </Text>
              <Text className="font-mono text-[14px] font-black text-brand-text">
                {money(queueValue, 0)}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-[9px] font-bold uppercase tracking-label text-brand-muted">
                Ort. Marj
              </Text>
              <Text
                className={`font-mono text-[14px] font-black ${
                  avgMargin < MARGIN_THRESHOLD_PCT ? 'text-red-600' : 'text-brand-primary'
                }`}
              >
                {percent(avgMargin, 1)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[9px] font-bold uppercase tracking-label text-brand-muted">
                Riskli Talep
              </Text>
              <Text className="font-mono text-[14px] font-black text-brand-text">
                {criticalCount}
              </Text>
            </View>
          </View>

          <View className="mt-2 flex-row items-center justify-between border-t border-brand-border pt-1.5">
            <Text className="text-[8px] text-brand-muted">
              Marj eşiği: %{MARGIN_THRESHOLD_PCT} • Otomatik onay aktif
            </Text>
            <Pressable onPress={resetDemo} hitSlop={6} accessibilityRole="button">
              <Text className="text-[8px] font-bold text-brand-muted underline">Demoyu sıfırla</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-2 gap-2 px-3">
          {visible.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onApprove={() => handleApprove(quote)}
              onDiscount={() => openDiscount(quote)}
              onCounter={() => openActions(quote)}
            />
          ))}

          {visible.length === 0 ? (
            <EmptyState
              icon="shield-checkmark-outline"
              title="Bekleyen talep yok"
              description="Bu sekmede şu anda işlem gerektiren bir teklif bulunmuyor."
            />
          ) : null}
        </View>
      </ScrollView>

      <ModalSheet
        visible={discountTarget !== null}
        onClose={() => setDiscountTarget(null)}
        title="Özel İskonto Uygula"
        subtitle={discountTarget ? `${discountTarget.customerName} • ${discountTarget.code}` : undefined}
        footer={
          <View className="flex-row">
            <Button
              label="Vazgeç"
              variant="outline"
              size="sm"
              onPress={() => setDiscountTarget(null)}
              className="mr-2 flex-1"
            />
            <Button label="İskonto ile Onayla" icon="checkmark" size="sm" onPress={applyDiscount} className="flex-[1.4]" />
          </View>
        }
      >
        {discountTarget ? (
          <View>
            <View className="rounded-xl border border-brand-border bg-brand-bg p-2.5">
              <Text className="text-[9px] text-brand-muted">Mevcut talep tutarı</Text>
              <Text className="font-mono text-[14px] font-black text-brand-text">
                {money(discountTarget.totalRequested, 0)}
              </Text>
              <Text className="mt-0.5 text-[9px] text-brand-muted">
                Mevcut net marj {percent(discountTarget.marginPct, 2)}
              </Text>
            </View>

            <Text className="mb-1 mt-3 text-[10px] font-bold text-brand-primary">İskonto Oranı (%)</Text>
            <View className="flex-row gap-1.5">
              {['2', '5', '10', '15'].map((option) => {
                const active = discountPct === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setDiscountPct(option)}
                    className={`flex-1 items-center rounded-lg border py-2 ${
                      active ? 'border-brand-primary bg-brand-accent/15' : 'border-brand-border bg-white'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${active ? 'text-brand-primary' : 'text-brand-muted'}`}
                    >
                      %{option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-2 flex-row items-center rounded-xl border border-brand-border bg-white px-3 py-2">
              <TextInput
                value={discountPct}
                onChangeText={setDiscountPct}
                keyboardType="decimal-pad"
                className="flex-1 text-[13px] font-bold text-brand-text"
                accessibilityLabel="İskonto oranı"
              />
              <Text className="text-[11px] font-bold text-brand-muted">%</Text>
            </View>

            <View className="mt-2 rounded-xl border border-brand-supporting/40 bg-brand-accent/10 p-2.5">
              <Text className="text-[9px] leading-relaxed text-brand-primary">
                İskonto sonrası marj %{MARGIN_THRESHOLD_PCT} altına düşerse teklif bölge satış
                müdürünün ek onayına iletilir.
              </Text>
            </View>
          </View>
        ) : null}
      </ModalSheet>

      <ModalSheet
        visible={actionTarget !== null}
        onClose={() => setActionTarget(null)}
        title="Karşı Teklif / Red"
        subtitle={actionTarget ? `${actionTarget.customerName} • ${actionTarget.code}` : undefined}
        footer={
          <View>
            <Button label="Karşı Teklif Gönder" icon="swap-horizontal" size="sm" onPress={submitCounter} fullWidth />
            <Button
              label="Talebi Reddet"
              variant="danger"
              size="sm"
              onPress={submitReject}
              fullWidth
              className="mt-1.5"
            />
          </View>
        }
      >
        {actionTarget ? (
          <View>
            <View className="rounded-xl border border-brand-border bg-brand-bg p-2.5">
              <Text className="text-[10px] font-bold text-brand-text">
                {actionTarget.items[0]?.name}
              </Text>
              <Text className="mt-0.5 text-[9px] text-brand-muted">
                Müşteri hedefi: {money(actionTarget.items[0]?.targetUnitPrice ?? 0, 0)} • liste:{' '}
                {money(actionTarget.items[0]?.listUnitPrice ?? 0, 0)}
              </Text>
            </View>

            <Text className="mb-1 mt-3 text-[10px] font-bold text-brand-primary">
              Önerilen Birim Fiyat (₺)
            </Text>
            <View className="flex-row items-center rounded-xl border border-brand-border bg-white px-3 py-2">
              <Text className="mr-1 text-[12px] font-bold text-brand-muted">₺</Text>
              <TextInput
                value={counterPrice}
                onChangeText={setCounterPrice}
                keyboardType="decimal-pad"
                className="flex-1 text-[13px] font-bold text-brand-text"
                accessibilityLabel="Karşı teklif birim fiyatı"
              />
            </View>

            <Text className="mb-1 mt-3 text-[10px] font-bold text-brand-primary">Ödeme Şekli</Text>
            <View className="flex-row gap-1.5">
              {(Object.keys(paymentTermMeta) as PaymentTerm[]).map((term) => {
                const active = counterTerm === term;
                return (
                  <Pressable
                    key={term}
                    onPress={() => setCounterTerm(term)}
                    className={`flex-1 rounded-lg border px-1 py-2 ${
                      active ? 'border-brand-primary bg-brand-accent/15' : 'border-brand-border bg-white'
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

            <Text className="mb-1 mt-3 text-[10px] font-bold text-brand-primary">
              Müşteriye Not
            </Text>
            <TextInput
              value={counterNote}
              onChangeText={setCounterNote}
              placeholder="Fiyat gerekçesi, vade veya sevkiyat koşulu..."
              placeholderTextColor="#94A3B8"
              multiline
              className="min-h-[60px] rounded-xl border border-brand-border bg-white px-3 py-2 text-[11px] text-brand-text"
              textAlignVertical="top"
            />

            <View className="mt-2 flex-row items-start rounded-xl border border-amber-200 bg-amber-50 p-2.5">
              <Ionicons name="information-circle" size={12} color={palette.warning} />
              <Text className="ml-1.5 flex-1 text-[9px] leading-relaxed text-amber-800">
                Karşı teklif gönderildiğinde müşterinin onayı beklenir. Red işlemi geri alınamaz.
              </Text>
            </View>

            {actionTarget.status === 'COUNTERED' && actionTarget.counterOffer ? (
              <Badge
                label={`Mevcut karşı teklif: ${money(actionTarget.counterOffer.proposedUnitPrice, 0)}`}
                className="mt-2 border-blue-200 bg-blue-50"
                textClassName="text-blue-700"
              />
            ) : null}
          </View>
        ) : null}
      </ModalSheet>
    </SafeAreaView>
  );
};
