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
import { HomeScreen } from '../screens/HomeScreen';
import { QuoteBuilderScreen } from '../screens/QuoteBuilderScreen';
import { QuoteNegotiationScreen } from '../screens/QuoteNegotiationScreen';
import { palette } from '../theme/tokens';

export type CustomerTabParamList = {
  Home: undefined;
  Catalog: undefined;
  QuoteBuilder: undefined;
  Negotiation: undefined;
  Ledger: undefined;
};

export type AdminTabParamList = {
  Approvals: undefined;
  Negotiation: undefined;
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
  tabBarActiveTintColor: '#536E27',
  tabBarInactiveTintColor: '#71717A',
  tabBarStyle: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E4E4E7',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 82 : 60,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 24 : 6,
  },
  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '700',
  },
};

/** Customer portal: Ana Sayfa → Katalog → Teklif Sepeti → Pazarlık → Cari Hesap */
const CustomerNavigator: React.FC = () => {
  const { cartItems } = useApp();

  return (
    <CustomerTabs.Navigator screenOptions={screenOptions} initialRouteName="Home">
      <CustomerTabs.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size - 2} color={color} />
          ),
        }}
      />
      <CustomerTabs.Screen
        name="Catalog"
        component={CustomerCatalogScreen}
        options={{
          title: 'Katalog',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="archive-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <CustomerTabs.Screen
        name="QuoteBuilder"
        component={QuoteBuilderScreen}
        options={{
          title: 'Teklif Sepeti',
          tabBarBadge: cartItems.length > 0 ? cartItems.length : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#8FBE1A',
            color: '#0e1406',
            fontSize: 9,
            fontWeight: 'bold',
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <CustomerTabs.Screen
        name="Negotiation"
        component={QuoteNegotiationScreen}
        options={{
          title: 'Pazarlık',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <CustomerTabs.Screen
        name="Ledger"
        component={FinancialLedgerScreen}
        options={{
          title: 'Cari',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart-outline" size={size - 2} color={color} />
          ),
        }}
      />
    </CustomerTabs.Navigator>
  );
};

const AdminLedgerStack = createNativeStackNavigator<AdminLedgerStackParamList>();

const AdminLedgerNavigator: React.FC = () => (
  <AdminLedgerStack.Navigator screenOptions={{ headerShown: false }}>
    <AdminLedgerStack.Screen name="AdminPortfolio" component={AdminPortfolioScreen} />
    <AdminLedgerStack.Screen name="CustomerLedger" component={FinancialLedgerScreen} />
  </AdminLedgerStack.Navigator>
);

/** Employee workspace: approval queue plus negotiation review & financial ledger. */
const AdminNavigator: React.FC = () => {
  const { pendingQuotes } = useApp();

  return (
    <AdminTabs.Navigator screenOptions={screenOptions} initialRouteName="Approvals">
      <AdminTabs.Screen
        name="Approvals"
        component={AdminApprovalHubScreen}
        options={{
          title: 'Onay Paneli',
          tabBarBadge: pendingQuotes > 0 ? pendingQuotes : undefined,
          tabBarBadgeStyle: { backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: 9 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <AdminTabs.Screen
        name="Negotiation"
        component={QuoteNegotiationScreen}
        options={{
          title: 'Pazarlık Dosyası',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <AdminTabs.Screen
        name="Ledger"
        component={AdminLedgerNavigator}
        options={{
          title: 'Cari Portföy',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart-outline" size={size - 2} color={color} />
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
