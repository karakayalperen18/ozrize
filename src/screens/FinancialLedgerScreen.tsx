import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatTile } from '../components/ui/StatTile';
import { useApp } from '../context/AppContext';
import { LEDGER_BY_CUSTOMER, LEDGER_ENTRIES } from '../data/mockData';
import { palette, riskMeta } from '../theme/tokens';
import type { LedgerEntry, LedgerEntryStatus } from '../types/b2b';
import { dateTR, money, moneyShort, percent } from '../utils/format';
import { creditHealth } from '../utils/pricing';

const statusBadge: Record<LedgerEntryStatus, { label: string; className: string; textClassName: string }> = {
  PAID: {
    label: 'Ödendi',
    className: 'bg-brand-accent/15 border-brand-accent/40',
    textClassName: 'text-brand-primary',
  },
  PENDING: {
    label: 'Beklemede',
    className: 'bg-amber-50 border-amber-200',
    textClassName: 'text-amber-700',
  },
  OVERDUE: {
    label: 'Gecikmiş',
    className: 'bg-red-50 border-red-200',
    textClassName: 'text-red-700',
  },
};

const entryIcon = (entry: LedgerEntry): keyof typeof Ionicons.glyphMap => {
  if (entry.type === 'COLLECTION') return 'arrow-down-circle';
  if (entry.type === 'ADJUSTMENT') return 'refresh-circle';
  return entry.status === 'OVERDUE' ? 'alert-circle' : 'receipt';
};

export const FinancialLedgerScreen: React.FC = () => {
  const route = useRoute();
  const { customer: currentCustomer, customers, role } = useApp();

  // Admin portföyünden seçilen şirketi göster; parametre yoksa mevcut müşteri geçerli.
  const requestedId = (route.params as { customerId?: string } | undefined)?.customerId;
  const customer = requestedId
    ? (customers.find((item) => item.id === requestedId) ?? currentCustomer)
    : currentCustomer;
  const credit = customer.credit;
  const ledger = LEDGER_BY_CUSTOMER[customer.id] ?? LEDGER_ENTRIES;

  const health = creditHealth(credit.utilizationPct);
  const risk = riskMeta[customer.riskLevel];

  const gaugeFill =
    health === 'CRITICAL' ? 'bg-red-500' : health === 'WATCH' ? 'bg-brand-accent' : 'bg-brand-supporting';

  const { debits, credits } = useMemo(() => {
    return ledger.reduce(
      (accumulator, entry) => {
        if (entry.amount >= 0) {
          accumulator.debits += entry.amount;
        } else {
          accumulator.credits += Math.abs(entry.amount);
        }
        return accumulator;
      },
      { debits: 0, credits: 0 },
    );
  }, [ledger]);

  const notify = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: 'Tamam' }]);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <AppHeader />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 108 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-3 pt-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[15px] font-black text-brand-text">
                {role === 'ADMIN' ? 'Müşteri Cari & Risk' : 'Cari Hesabım'}
              </Text>
              <Text className="text-[10px] text-brand-muted">{customer.name} • #{customer.code}</Text>
            </View>
            <Badge
              label={risk.label}
              className={risk.badgeClass}
              textClassName={risk.textClass}
              dotClassName={risk.dotClass}
            />
          </View>
        </View>

        <View className="mx-3 mt-2 rounded-card border border-brand-border bg-white p-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[9px] font-bold uppercase tracking-label text-brand-muted">
                Kullanılabilir Limit
              </Text>
              <Text className="font-mono text-[22px] font-black leading-tight text-brand-primary">
                {moneyShort(credit.available)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[9px] text-brand-muted">Toplam limit</Text>
              <Text className="font-mono text-[12px] font-bold text-brand-text">
                {moneyShort(credit.limit)}
              </Text>
            </View>
          </View>

          <ProgressBar
            value={credit.utilizationPct / 100}
            fillClassName={gaugeFill}
            className="mt-2.5"
            height={9}
          />

          <View className="mt-1.5 flex-row items-center justify-between">
            <Text className="text-[9px] text-brand-muted">
              {percent(credit.utilizationPct, 1)} kullanım
            </Text>
            <Text
              className={`text-[10px] font-black ${
                health === 'CRITICAL' ? 'text-red-600' : 'text-brand-text'
              }`}
            >
              {health === 'CRITICAL'
                ? 'Limit kritik seviyede'
                : health === 'WATCH'
                  ? 'Limit izlenmeli'
                  : 'Limit sağlıklı'}
            </Text>
          </View>

          <View className="mt-2 flex-row justify-between rounded-lg bg-brand-bg px-2 py-1.5">
            <View>
              <Text className="text-[8px] uppercase text-brand-muted">Açık Hesap</Text>
              <Text className="font-mono text-[10px] font-bold text-brand-text">
                {moneyShort(credit.outstanding)}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-[8px] uppercase text-brand-muted">Vadesi Geçmiş</Text>
              <Text
                className={`font-mono text-[10px] font-bold ${
                  credit.overdue > 0 ? 'text-red-600' : 'text-brand-primary'
                }`}
              >
                {moneyShort(credit.overdue)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[8px] uppercase text-brand-muted">Risk Skoru</Text>
              <Text className="font-mono text-[10px] font-bold text-brand-text">
                {credit.riskScore}
              </Text>
            </View>
          </View>
        </View>

        <View className="mx-3 mt-2 flex-row gap-2">
          <StatTile
            label="Toplam Borç"
            value={moneyShort(credit.outstanding + credit.overdue)}
            hint="Güncel açık hesap"
            className="flex-1"
          />
          <StatTile
            label="Vadesi Geçmiş"
            value={moneyShort(credit.overdue)}
            hint={credit.overdue > 0 ? 'Gecikme mevcut' : 'Gecikme yok'}
            valueClassName={credit.overdue > 0 ? 'text-red-600' : 'text-brand-primary'}
            hintClassName={credit.overdue > 0 ? 'text-red-600' : 'text-brand-primary'}
            className="flex-1"
          />
        </View>

        <View className="mx-3 mt-2 flex-row gap-2">
          <StatTile
            label="Kalan Limit"
            value={moneyShort(credit.available)}
            hint={`Toplam: ${moneyShort(credit.limit)}`}
            valueClassName="text-brand-primary"
            className="flex-1"
          />
          <StatTile
            label="Risk Derecesi"
            value={`Skor: ${credit.riskScore}`}
            hint={risk.label}
            hintClassName={risk.textClass}
            className="flex-1"
          />
        </View>

        <View className="mx-3 mt-3 flex-row items-center justify-between">
          <Text className="text-[11px] font-black uppercase tracking-label text-brand-primary">
            Son Hesap Hareketleri
          </Text>
          <Text className="text-[9px] text-brand-muted">Son 30 gün</Text>
        </View>

        <View className="mx-3 mt-1.5 gap-1.5">
          {ledger.map((entry) => {
            const badge = statusBadge[entry.status];
            const isCreditRow = entry.amount < 0;
            return (
              <View
                key={entry.id}
                className="flex-row items-center rounded-xl border border-brand-border bg-white p-2.5"
              >
                <View
                  className={`h-8 w-8 items-center justify-center rounded-lg ${
                    entry.status === 'OVERDUE'
                      ? 'bg-red-50'
                      : isCreditRow
                        ? 'bg-blue-50'
                        : 'bg-brand-bg'
                  }`}
                >
                  <Ionicons
                    name={entryIcon(entry)}
                    size={15}
                    color={
                      entry.status === 'OVERDUE'
                        ? palette.danger
                        : isCreditRow
                          ? palette.info
                          : palette.primary
                    }
                  />
                </View>

                <View className="ml-2 flex-1">
                  <Text className="text-[11px] font-bold text-brand-text" numberOfLines={1}>
                    {entry.reference}
                  </Text>
                  <Text className="text-[9px] text-brand-muted" numberOfLines={1}>
                    {dateTR(entry.date)} • {entry.description}
                  </Text>
                </View>

                <View className="items-end">
                  <Text
                    className={`font-mono text-[11px] font-black ${
                      isCreditRow ? 'text-brand-primary' : 'text-brand-text'
                    }`}
                  >
                    {isCreditRow ? '-' : ''}
                    {money(Math.abs(entry.amount), 0)}
                  </Text>
                  <Badge
                    label={badge.label}
                    className={`mt-0.5 ${badge.className}`}
                    textClassName={badge.textClassName}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <View className="mx-3 mt-2 rounded-card border border-brand-border bg-white p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-[9px] font-bold uppercase tracking-label text-brand-muted">
              Dönem Özeti
            </Text>
            <Text className="text-[8px] text-brand-muted">KDV dahil</Text>
          </View>
          <View className="mt-1.5 flex-row items-center justify-between">
            <Text className="text-[10px] text-brand-muted">Borçlandırma</Text>
            <Text className="font-mono text-[10px] font-bold text-brand-text">
              {money(debits, 0)}
            </Text>
          </View>
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="text-[10px] text-brand-muted">Tahsilat / İade</Text>
            <Text className="font-mono text-[10px] font-bold text-brand-primary">
              -{money(credits, 0)}
            </Text>
          </View>
          <View className="mt-1.5 flex-row items-center justify-between border-t border-brand-border pt-1.5">
            <Text className="text-[10px] font-black text-brand-text">Net Bakiye</Text>
            <Text className="font-mono text-[12px] font-black text-brand-text">
              {money(debits - credits, 0)}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-brand-border bg-brand-dark px-3 pb-3 pt-2.5">
        <View className="flex-row gap-2">
          <Button
            label="Cari Ekstre (PDF)"
            icon="download-outline"
            variant="dark"
            size="sm"
            onPress={() =>
              notify(
                'Cari ekstre',
                `${customer.name} için ${dateTR(new Date().toISOString())} tarihli ekstre hazırlanıyor.`,
              )
            }
            className="flex-1"
          />
          <Button
            label="Ödeme Bildirimi"
            icon="cash-outline"
            size="sm"
            onPress={() =>
              notify(
                'Ödeme bildirimi',
                'Havale/EFT bildiriminiz satış ekibine iletildi. Muhasebe 1 iş günü içinde eşleştirir.',
              )
            }
            className="flex-1"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};
