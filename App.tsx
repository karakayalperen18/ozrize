import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './global.css';

import { AppProvider, useApp } from './src/context/AppContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { palette } from './src/theme/tokens';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.primary,
    background: palette.bg,
    card: palette.surface,
    text: palette.text,
    border: palette.border,
  },
};

/** Remounts the navigation tree when the role flips so each role starts on its own tab. */
function AppNavigation() {
  const { role } = useApp();

  return (
    <NavigationContainer key={role} theme={navigationTheme}>
      <StatusBar style="light" />
      <RootNavigator />
    </NavigationContainer>
  );
}

/** Supabase oturumu kontrol edilirken gösterilen sade yükleme görünümü. */
function LoadingGate() {
  return (
    <View className="flex-1 items-center justify-center bg-brand-bg">
      <ActivityIndicator size="large" color={palette.primary} />
    </View>
  );
}

/**
 * Auth kapısı: Supabase yapılandırılmadıysa (OFFLINE) doğrudan demo açılır;
 * yapılandırıldıysa oturum yokken giriş ekranı gösterilir.
 */
function AppGate() {
  const { status } = useAuth();

  if (status === 'LOADING') return <LoadingGate />;
  if (status === 'SIGNED_OUT') return <LoginScreen />;
  return <AppNavigation />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppProvider>
            <AppGate />
          </AppProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
