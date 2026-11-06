import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { useApp } from '../context/AppContext';
import { palette } from '../theme/tokens';
import { moneyShort, percent } from '../utils/format';
import { creditHealth } from '../utils/pricing';
import { ProgressBar } from './ui/ProgressBar';

interface CreditBannerProps {
  /** Shows the pending cart exposure line when a quote is being built. */
  showCartExposure?: boolean;
}

/** Credit limit gauge pinned under the header on the customer portal. */
export const CreditBanner: React.FC<CreditBannerProps> = ({ showCartExposure = true }) => {
  const { credit, creditCheck, cartItems } = useApp();
  const health = creditHealth(credit.utilizationPct);

  const fill =
    health === 'CRITICAL'
      ? 'bg-red-500'
      : health === 'WATCH'
        ? 'bg-brand-accent'
        : 'bg-brand-supporting';

  return (
    <View className="rounded-card border border-brand-border bg-white p-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="card-outline" size={13} color={palette.primary} />
          <Text className="ml-1.5 text-[10px] font-bold uppercase tracking-label text-brand-primary">
            Kredi Limiti
          </Text>
        </View>
        <Text className="ml-2 shrink text-right font-mono text-[10px] font-bold text-brand-text" numberOfLines={1}>
          {moneyShort(credit.outstanding + credit.overdue)} / {moneyShort(credit.limit)}
        </Text>
      </View>

      <ProgressBar
        value={credit.utilizationPct / 100}
        fillClassName={fill}
        className="mt-2"
        height={7}
      />

      <View className="mt-1.5 flex-row items-center justify-between">
        <Text className="text-[9px] text-brand-muted">
          {percent(credit.utilizationPct, 1)} kullanıldı
        </Text>
        <Text
          className={`text-[10px] font-black ${
            health === 'CRITICAL' ? 'text-red-600' : 'text-brand-primary'
          }`}
        >
          Kalan: {moneyShort(credit.available)}
        </Text>
      </View>

      <View className="mt-2 flex-row items-center justify-between rounded-lg bg-brand-bg px-2 py-1.5">
        <View>
          <Text className="text-[8px] uppercase text-brand-muted">Vadesi Geçmiş</Text>
          <Text
            className={`text-[10px] font-bold ${
              credit.overdue > 0 ? 'text-red-600' : 'text-brand-primary'
            }`}
          >
            {moneyShort(credit.overdue)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[8px] uppercase text-brand-muted">Risk Skoru</Text>
          <Text className="text-[10px] font-bold text-brand-text">{credit.riskScore}</Text>
        </View>
      </View>

      {showCartExposure && cartItems.length > 0 ? (
        <View
          className={`mt-2 rounded-lg border px-2 py-1.5 ${
            creditCheck.exceeds
              ? 'border-red-200 bg-red-50'
              : 'border-brand-supporting/40 bg-brand-accent/10'
          }`}
        >
          <Text
            className={`text-[9px] font-semibold ${
              creditCheck.exceeds ? 'text-red-700' : 'text-brand-primary'
            }`}
          >
            {creditCheck.exceeds
              ? `Bu teklif limiti ${moneyShort(creditCheck.overflow)} aşıyor — gönderim engellenecek.`
              : `Sepet sonrası kullanılabilir: ${moneyShort(
                  Math.max(credit.limit - creditCheck.projectedExposure, 0),
                )}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
};
