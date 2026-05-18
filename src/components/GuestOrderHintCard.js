import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, getShadows, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function GuestOrderHintCard({ colors, onOpenAuth }) {
  const { isDarkMode } = useTheme();
  const shadows = useMemo(() => getShadows(isDarkMode), [isDarkMode]);
  return (
    <View style={[styles.card, { borderColor: colors.hairline, backgroundColor: colors.cardElevated }]}>
      <Text style={[styles.title, { color: colors.text }]}>Чтобы оформить заказ, нужно войти</Text>
      <Text style={[styles.text, { color: colors.textLight }]}>
        Авторизуйтесь или зарегистрируйтесь, чтобы добавить блюдо в корзину и перейти к оплате.
      </Text>
      {typeof onOpenAuth === 'function' ? (
        <TouchableOpacity
          onPress={onOpenAuth}
          style={[styles.button, { backgroundColor: colors.primary }, shadows.accentGlow]}
          activeOpacity={0.9}
        >
          <Text style={[styles.buttonText, { color: colors.black }]}>Войти / Регистрация</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
  },
  text: {
    ...typography.caption,
  },
  button: {
    marginTop: spacing.xs,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  buttonText: {
    ...typography.button,
    fontWeight: '700',
  },
});
