import React, { useEffect } from 'react';
import { ActivityIndicator, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import ProductionConfigGate from './src/components/ProductionConfigGate';
import { getProductionConfigIssues } from './src/config/validateProductionConfig';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { ClientDataProvider } from './src/contexts/ClientDataContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import AppNavigator from './src/navigation/AppNavigator';
import { BRAND_LILAC, BRAND_LIME } from './src/constants/theme';
import { logger } from './src/utils/logger';

function ThemedRoot() {
  const { isDarkMode } = useTheme();
  return (
    <View style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <AppNavigator />
    </View>
  );
}

function AppBootstrapped() {
  useEffect(() => {
    const configIssues = getProductionConfigIssues();
    if (configIssues.length) {
      logger.warn('[config] production checks:', configIssues.join(' | '));
    }

    const prev = global.onunhandledrejection;
    global.onunhandledrejection = (event) => {
      logger.warn('[unhandledrejection]', event?.reason);
      if (typeof prev === 'function') prev(event);
    };
    return () => {
      global.onunhandledrejection = prev;
    };
  }, []);

  return (
    <AppErrorBoundary>
      <ProductionConfigGate>
        <ThemeProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={styles.container}>
              <NetworkProvider>
                <AuthProvider>
                  <ClientDataProvider>
                    <ThemedRoot />
                  </ClientDataProvider>
                </AuthProvider>
              </NetworkProvider>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </ThemeProvider>
      </ProductionConfigGate>
    </AppErrorBoundary>
  );
}

export default function App() {
  const [loaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!loaded) {
    return (
      <View style={styles.boot}>
        <RNStatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={BRAND_LIME} />
        <View style={[styles.bootStripe, { backgroundColor: BRAND_LILAC }]} />
      </View>
    );
  }

  return <AppBootstrapped />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  boot: {
    flex: 1,
    backgroundColor: '#F7F2FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bootStripe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 5,
  },
});
