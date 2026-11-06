import { Ionicons } from '@expo/vector-icons';
import {
  createBottomTabNavigator,
  type BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform } from 'react-native';

import { useApp } from '../context/AppContext';
import { AdminApprovalHubScreen } from '../screens/AdminApprovalHubScreen';
import { AdminPortfolioScreen } from '../screens/AdminPortfolioScreen';
import { CustomerCatalogScreen } from '../screens/CustomerCatalogScreen';
import { FinancialLedgerScreen } from '../screens/FinancialLedgerScreen';
import { QuoteBuilderScreen } from '../screens/QuoteBuilderScreen';
import { palette } from '../theme/tokens';

export type CustomerTabParamList = {
  Catalog: undefined;
  QuoteBuilder: undefined;
  Ledger: undefined;
};

export type AdminTabParamList = {
  Approvals: undefined;
  Ledger: undefined;
};

export type AdminLedgerStackParamList = {
  AdminPortfolio: undefined;
  CustomerLedger: { customerId: string };
};

const CustomerTabs = createBottomTabNavigator<CustomerTabParamList>();
const AdminTabs = createBottomTabNavigator<AdminTabParamList>();

const screenOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: palette.primary,
  tabBarInactiveTintColor: palette.muted,
  tabBarStyle: {
    backgroundColor: palette.surface,
    borderTopColor: palette.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 62,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 26 : 8,
  },
  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '700',
  },
};

/** Customer portal: catalog → quote builder → credit ledger. */
const CustomerNavigator: React.FC = () => {
  const { cartItems } = useApp();

  return (
    <CustomerTabs.Navigator screenOptions={screenOptions}>
      <CustomerTabs.Screen
        name="Catalog"
        component={CustomerCatalogScreen}
        options={{
          title: 'Katalog',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <CustomerTabs.Screen
        name="QuoteBuilder"
        component={QuoteBuilderScreen}
        options={{
          title: 'Teklifim',
          tabBarBadge: cartItems.length > 0 ? cartItems.length : undefined,
          tabBarBadgeStyle: { backgroundColor: palette.accent, color: palette.dark, fontSize: 9 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <CustomerTabs.Screen
        name="Ledger"
        component={FinancialLedgerScreen}
        options={{
          title: 'Cari Hesap',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart-outline" size={size} color={color} />
          ),
        }}
      />
    </CustomerTabs.Navigator>
  );
};

const AdminLedgerStack = createNativeStackNavigator<AdminLedgerStackParamList>();

/** Admin "Cari Hesap" tab: portfolio list → per-customer ledger detail. */
const AdminLedgerNavigator: React.FC = () => (
  <AdminLedgerStack.Navigator screenOptions={{ headerShown: false }}>
    <AdminLedgerStack.Screen name="AdminPortfolio" component={AdminPortfolioScreen} />
    <AdminLedgerStack.Screen name="CustomerLedger" component={FinancialLedgerScreen} />
  </AdminLedgerStack.Navigator>
);

/** Employee workspace: approval queue plus the shared financial ledger. */
const AdminNavigator: React.FC = () => {
  const { pendingQuotes } = useApp();

  return (
    <AdminTabs.Navigator screenOptions={screenOptions}>
      <AdminTabs.Screen
        name="Approvals"
        component={AdminApprovalHubScreen}
        options={{
          title: 'Onaylar',
          tabBarBadge: pendingQuotes > 0 ? pendingQuotes : undefined,
          tabBarBadgeStyle: { backgroundColor: palette.danger, color: '#FFFFFF', fontSize: 9 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size} color={color} />
          ),
        }}
      />
      <AdminTabs.Screen
        name="Ledger"
        component={AdminLedgerNavigator}
        options={{
          title: 'Cari Hesap',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart-outline" size={size} color={color} />
          ),
        }}
      />
    </AdminTabs.Navigator>
  );
};

/** Swaps the whole tab tree when the role changes so state and titles stay coherent. */
export const RootNavigator: React.FC = () => {
  const { role } = useApp();
  return role === 'ADMIN' ? <AdminNavigator key="admin" /> : <CustomerNavigator key="customer" />;
};
