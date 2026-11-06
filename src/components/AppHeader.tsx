import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { palette, riskMeta } from '../theme/tokens';

/** Olive brand header with the account identity and the runtime role switch. */
export const AppHeader: React.FC = () => {
  const { role, toggleRole, customer, pendingQuotes } = useApp();
  const { status, signOut } = useAuth();
  const isAdmin = role === 'ADMIN';
  const isAuthed = status === 'SIGNED_IN';
  const risk = riskMeta[customer.riskLevel];

  return (
    <View className="bg-brand-primary px-4 pb-3 pt-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center pr-2">
          <View className="h-9 w-9 items-center justify-center rounded-2xl bg-white">
            <Ionicons name="leaf" size={18} color={palette.primary} />
          </View>
          <View className="ml-2.5 flex-1">
            <View className="flex-row items-center">
              <Text className="text-[13px] font-black leading-none text-white" numberOfLines={1}>
                {isAdmin ? 'Operasyon Paneli' : customer.name}
              </Text>
            </View>
            <View className="mt-1 flex-row items-center">
              {isAdmin ? (
                <Text className="text-[9px] font-semibold uppercase tracking-label text-brand-accent">
                  {pendingQuotes} onay bekliyor
                </Text>
              ) : (
                <>
                  <Text className="text-[9px] text-white/70" numberOfLines={1}>
                    Müşteri No: #{customer.code}
                  </Text>
                  <View className="ml-1.5 rounded-full bg-white/15 px-1.5 py-[1px]">
                    <Text className="text-[8px] font-bold text-brand-accent">{risk.label}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        <View className="flex-row items-center">
          {isAuthed ? (
            <Pressable
              onPress={signOut}
              accessibilityRole="button"
              accessibilityLabel="Oturumu kapat"
              hitSlop={6}
              className="mr-1.5 h-8 w-8 items-center justify-center rounded-full bg-black/25"
            >
              <Ionicons name="log-out-outline" size={14} color="#FFFFFF" />
            </Pressable>
          ) : null}
          <Pressable
            onPress={toggleRole}
            accessibilityRole="button"
            accessibilityLabel="Kullanıcı rolünü değiştir"
            className="flex-row items-center rounded-full bg-black/25 px-2.5 py-1.5"
          >
            <Ionicons name="swap-horizontal" size={12} color={palette.accent} />
            <Text className="ml-1 text-[9px] font-bold text-white">
              {isAdmin ? 'Müşteri' : 'Admin'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-2 flex-row items-center rounded-lg bg-black/20 px-2 py-1">
        <Ionicons
          name={isAdmin ? 'shield-checkmark' : 'business'}
          size={10}
          color={palette.accent}
        />
        <Text className="ml-1 flex-1 text-[9px] text-white/80" numberOfLines={1}>
          {isAdmin
            ? `${customer.contactName} • Bölge Satış Müdürü`
            : `${customer.contactName} • ${customer.city} • VKN ${customer.taxNumber}`}
        </Text>
      </View>
    </View>
  );
};
