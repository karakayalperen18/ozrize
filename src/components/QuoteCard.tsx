import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { palette, paymentTermMeta, quoteStatusMeta, riskMeta } from '../theme/tokens';
import type { QuoteRequest } from '../types/b2b';
import { dateTR, money, percent } from '../utils/format';
import { MARGIN_THRESHOLD_PCT } from '../utils/pricing';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';

interface QuoteCardProps {
  quote: QuoteRequest;
  onApprove: () => void;
  onDiscount: () => void;
  onCounter: () => void;
}

/** Approval card shown to employees: margin analysis plus executive actions. */
export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  onApprove,
  onDiscount,
  onCounter,
}) => {
  const status = quoteStatusMeta[quote.status];
  const risk = riskMeta[quote.riskLevel];
  const costTotal = quote.items.reduce((sum, item) => sum + item.costUnitPrice * item.quantity, 0);
  const belowThreshold = quote.marginPct < MARGIN_THRESHOLD_PCT;
  const marginFill = belowThreshold ? 'bg-red-500' : 'bg-brand-accent';

  const isOpen = quote.status === 'PENDING' || quote.status === 'COUNTERED';

  return (
    <View className="rounded-card border border-brand-border bg-white p-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-[12px] font-black leading-tight text-brand-text" numberOfLines={1}>
            {quote.customerName}
          </Text>
          <View className="mt-1 flex-row items-center">
            <Badge
              label={risk.label}
              className={risk.badgeClass}
              textClassName={risk.textClass}
              dotClassName={risk.dotClass}
            />
            <Text className="ml-1.5 font-mono text-[9px] text-brand-muted">{quote.code}</Text>
          </View>
        </View>

        <Badge
          label={status.label}
          className={status.badgeClass}
          textClassName={status.textClass}
          dotClassName={status.dotClass}
        />
      </View>

      <View className="mt-1.5 flex-row items-center">
        <Ionicons name="calendar-outline" size={9} color={palette.muted} />
        <Text className="ml-1 text-[9px] text-brand-muted">{dateTR(quote.createdAt)}</Text>
        <Text className="mx-1 text-brand-border">•</Text>
        <Ionicons name="card-outline" size={9} color={palette.muted} />
        <Text className="ml-1 text-[9px] text-brand-muted">
          {paymentTermMeta[quote.paymentTerm].label}
        </Text>
        <Text className="mx-1 text-brand-border">•</Text>
        <Text className="text-[9px] text-brand-muted">{quote.items.length} kalem</Text>
      </View>

      <View className="mt-2 rounded-lg bg-brand-bg p-2">
        {quote.items.slice(0, 2).map((item) => (
          <View key={item.id} className="flex-row items-center justify-between py-0.5">
            <View className="flex-1 pr-2">
              <Text className="text-[10px] font-semibold text-brand-text" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-[8px] text-brand-muted">
                {item.quantity} {item.unit} • liste {money(item.listUnitPrice, 0)}
              </Text>
            </View>
            <Text className="font-mono text-[10px] font-bold text-brand-text">
              {money(item.targetUnitPrice, 0)}
            </Text>
          </View>
        ))}
        {quote.items.length > 2 ? (
          <Text className="mt-1 text-[8px] text-brand-muted">
            +{quote.items.length - 2} kalem daha
          </Text>
        ) : null}
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <View>
          <Text className="text-[8px] uppercase text-brand-muted">Talep Tutarı</Text>
          <Text className="font-mono text-[12px] font-black text-brand-text">
            {money(quote.totalRequested, 0)}
          </Text>
        </View>
        <View>
          <Text className="text-[8px] uppercase text-brand-muted">Sistem Maliyeti</Text>
          <Text className="font-mono text-[11px] font-bold text-brand-muted">
            {money(costTotal, 0)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[8px] uppercase text-brand-muted">Net Marj</Text>
          <Text
            className={`font-mono text-[12px] font-black ${
              belowThreshold ? 'text-red-600' : 'text-brand-primary'
            }`}
          >
            {percent(quote.marginPct, 2)}
          </Text>
        </View>
      </View>

      <ProgressBar
        value={Math.min(Math.max(quote.marginPct / 30, 0), 1)}
        fillClassName={marginFill}
        className="mt-1"
        height={5}
      />

      {belowThreshold ? (
        <View className="mt-1.5 flex-row items-center rounded-lg border border-red-200 bg-red-50 px-2 py-1">
          <Ionicons name="warning" size={10} color={palette.danger} />
          <Text className="ml-1 text-[9px] font-semibold text-red-700">
            Marj %{MARGIN_THRESHOLD_PCT} eşiğinin altında — yönetici onayı gerekir.
          </Text>
        </View>
      ) : null}

      {quote.note ? (
        <View className="mt-2 rounded-lg border border-brand-border px-2 py-1.5">
          <Text className="text-[8px] font-bold uppercase text-brand-primary">Müşteri Notu</Text>
          <Text className="mt-0.5 text-[9px] leading-relaxed text-brand-muted" numberOfLines={2}>
            {quote.note}
          </Text>
        </View>
      ) : null}

      {quote.status === 'COUNTERED' && quote.counterOffer ? (
        <View className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5">
          <Text className="text-[8px] font-bold uppercase text-blue-700">Karşı Teklif</Text>
          <Text className="mt-0.5 text-[9px] text-blue-900">
            {money(quote.counterOffer.proposedUnitPrice, 0)} •{' '}
            {paymentTermMeta[quote.counterOffer.paymentTerm].shortLabel}
          </Text>
        </View>
      ) : null}

      {isOpen ? (
        <View className="mt-2.5">
          <View className="flex-row">
            <Button
              label="Teklifi Onayla"
              icon="checkmark-circle"
              size="sm"
              onPress={onApprove}
              className="mr-1.5 flex-1"
            />
            <Button
              label="İskonto"
              icon="pricetag"
              variant="outline"
              size="sm"
              onPress={onDiscount}
              className="flex-1"
            />
          </View>
          <Button
            label="Reddet / Karşı Teklif"
            icon="swap-horizontal"
            variant="ghost"
            size="sm"
            onPress={onCounter}
            className="mt-1.5"
            fullWidth
          />
        </View>
      ) : (
        <View className="mt-2 flex-row items-center">
          <Ionicons name="checkmark-done" size={11} color={palette.supporting} />
          <Text className="ml-1 text-[9px] text-brand-muted">
            {quote.decisionNote ?? 'Karar verildi.'}
          </Text>
        </View>
      )}
    </View>
  );
};
