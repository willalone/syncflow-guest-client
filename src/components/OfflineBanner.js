import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily, spacing, typography } from '../constants/theme';
import { useNetwork } from '../contexts/NetworkContext';

export default function OfflineBanner() {
  const { isOffline } = useNetwork();
  const insets = useSafeAreaInsets();

  if (!isOffline) return null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.xs }]} pointerEvents="none">
      <Text style={styles.text}>Нет соединения с интернетом. Заказ и бронь недоступны до восстановления сети.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(180, 50, 50, 0.94)',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  text: {
    ...typography.caption,
    color: '#fff',
    fontFamily: fontFamily.sansMedium,
    textAlign: 'center',
  },
});
