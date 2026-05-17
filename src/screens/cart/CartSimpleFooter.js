import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getColors, getGlassTokens, getShadows, layout, spacing, typography } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export default function CartSimpleFooter({ total, itemCount, onProceedToCheckout, disabled = false }) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const glass = getGlassTokens(isDarkMode);
  const shadowsThemed = useMemo(() => getShadows(isDarkMode), [isDarkMode]);
  const canProceed = itemCount > 0 && !disabled;

  return (
    <View
      style={[
        styles.footer,
        { backgroundColor: glass.fillStrong, borderTopColor: glass.border },
        isDarkMode ? shadowsThemed.glowSoft : null,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.summary}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Итого</Text>
          <Text style={[styles.total, { color: colors.text }]}>{total.toFixed(0)} ₽</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {itemCount > 0 ? `${itemCount} поз.` : 'Корзина пуста'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onProceedToCheckout}
          disabled={!canProceed}
          activeOpacity={0.9}
          style={[
            styles.button,
            { backgroundColor: canProceed ? colors.primary : colors.textMuted },
            canProceed && isDarkMode ? shadowsThemed.glowLime : null,
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.black }]}>Перейти к оплате</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summary: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    ...typography.caption,
  },
  total: {
    ...typography.h3,
    letterSpacing: -0.3,
  },
  hint: {
    ...typography.caption,
    marginTop: 2,
  },
  button: {
    borderRadius: 999,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...typography.button,
    fontWeight: '700',
  },
});
