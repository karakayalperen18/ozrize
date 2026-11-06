import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useApp } from '../context/AppContext';
import type { AdminLedgerStackParamList } from '../navigation/RootNavigator';
import { palette, riskMeta } from '../theme/tokens';
import { moneyShort, percent } from '../utils/format';
import { creditHealth } from '../utils/pricing';

/** Sales team view: every corporate customer with limit usage and risk at a glance. */
export const AdminPortfolioScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<AdminLedgerStackParamList>>();
  const { customers } = useApp();

  const summary = useMemo(() => {
    const totalLimit = customers.reduce((sum, item) => sum + item.credit.limit, 0);
    const totalExposure = customers.reduce(
      (sum, item) => sum + item.credit.outstanding + item.credit.overdue,
      0,
    );
    const criticalCount = customers.filter(
      (item) => creditHealth(item.credit.utilizationPct) === 'CRITICAL',
    ).length;
    const highRiskCount = customers.filter((item) => item.riskLevel === 'HIGH').length;
    return { totalLimit, totalExposure, criticalCount, highRiskCount };
  }, [customers]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <AppHeader />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-3 pt-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[15px] font-black text-brand-text">Müşteri Portföyü</Text>
              <Text className="text-[10px] text-brand-muted">
                {customers.length} şirket • tüm cari hesaplar
              </Text>
            </View>
            <Badge
              label={`${summary.highRiskCount} yüksek risk`}
              className={
                summary.highRiskCount > 0 ? 'border-red-200 bg-red-50' : 'border-brand-border bg-white'
              }
              textClassName={summary.highRiskCount > 0 ? 'text-red-700' : 'text-brand-muted'}
            />
          </View>
        </View>

        <View className="mx-3 mt-2 flex-row gap-2">
          <View className="flex-1 rounded-card border border-brand-border bg-white p-3">
            <Text className="text-[9px] font-bold uppercase tracking-label text-brand-muted">
              Toplam Açık
            </Text>
            <Text className="mt-0.5 font-mono text-[14px] font-black text-brand-text">
              {moneyShort(summary.totalExposure)}
            </Text>
          </View>
          <View className="flex-1 rounded-card border border-brand-border bg-white p-3">
            <Text className="text-[9px] font-bold uppercase tracking-label text-brand-muted">
              Toplam Limit
            </Text>
            <Text className="mt-0.5 font-mono text-[14px] font-black text-brand-text">
              {moneyShort(summary.totalLimit)}
            </Text>
          </View>
        </View>

        <View className="mx-3 mt-2 flex-row items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <Ionicons name="warning" size={12} color={palette.warning} />
          <Text className="ml-1.5 flex-1 text-[9px] font-semibold text-amber-800">
            {summary.criticalCount} şirketin limit kullanımı kritik seviyede.
          </Text>
        </View>

        <View className="mt-3 gap-2 px-3">
          {customers.map((customer) => {
            const health = creditHealth(customer.credit.utilizationPct);
            const risk = riskMeta[customer.riskLevel];
            const fill =
              health === 'CRITICAL'
                ? 'bg-red-500'
                : health === 'WATCH'
                  ? 'bg-brand-accent'
                  : 'bg-brand-supporting';
            const healthLabel =
              health === 'CRITICAL' ? 'Kritik' : health === 'WATCH' ? 'İzlenmeli' : 'Sağlıklı';

            return (
              <Pressable
                key={customer.id}
                onPress={() => navigation.navigate('CustomerLedger', { customerId: customer.id })}
                accessibilityRole="button"
                accessibilityLabel={`${customer.name} cari hesabını aç`}
                className="rounded-card border border-brand-border bg-white p-3 active:opacity-90"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-[12px] font-black leading-tight text-brand-text" numberOfLines={1}>
                      {customer.name}
                    </Text>
                    <Text className="mt-0.5 font-mono text-[9px] text-brand-muted">
                      #{customer.code} • {customer.city}
                    </Text>
                  </View>
                  <Badge
                    label={risk.label}
                    className={risk.badgeClass}
                    textClassName={risk.textClass}
                    dotClassName={risk.dotClass}
                  />
                </View>

                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-[9px] text-brand-muted">
                    {percent(customer.credit.utilizationPct, 1)} kullanım
                  </Text>
                  <Text
                    className={`text-[9px] font-black ${
                      health === 'CRITICAL' ? 'text-red-600' : 'text-brand-muted'
                    }`}
                  >
                    {healthLabel}
                  </Text>
                </View>
                <ProgressBar
                  value={customer.credit.utilizationPct / 100}
                  fillClassName={fill}
                  className="mt-1"
                  height={6}
                />

                <View className="mt-2 flex-row items-center justify-between rounded-lg bg-brand-bg px-2 py-1.5">
                  <View>
                    <Text className="text-[8px] uppercase text-brand-muted">Kalan Limit</Text>
                    <Text className="font-mono text-[10px] font-bold text-brand-primary">
                      {moneyShort(customer.credit.available)}
                    </Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-[8px] uppercase text-brand-muted">Açık Hesap</Text>
                    <Text className="font-mono text-[10px] font-bold text-brand-text">
                      {moneyShort(customer.credit.outstanding)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[8px] uppercase text-brand-muted">Vadesi Geçmiş</Text>
                    <Text
                      className={`font-mono text-[10px] font-bold ${
                        customer.credit.overdue > 0 ? 'text-red-600' : 'text-brand-primary'
                      }`}
                    >
                      {moneyShort(customer.credit.overdue)}
                    </Text>
                  </View>
                </View>

                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-[9px] text-brand-muted">
                    Limit: {moneyShort(customer.credit.limit)} • Skor {customer.credit.riskScore}
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-[9px] font-bold text-brand-primary">Detay</Text>
                    <Ionicons name="chevron-forward" size={11} color={palette.primary} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
