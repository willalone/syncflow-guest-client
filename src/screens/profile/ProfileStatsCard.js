import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, spacing, typography } from '../../constants/theme';

export default function ProfileStatsCard({
  colors,
  shadowsThemed,
  loyaltyPoints,
  hasXpData,
  xpPoints,
  loyaltyLevel,
  discountPercentage,
  visitCount,
  registrationDate,
}) {
  const showGuestLoyalty =
    discountPercentage != null ||
    (visitCount != null && Number.isFinite(Number(visitCount))) ||
    Boolean(registrationDate);
  return (
    <View
      style={[
        styles.statsCard,
        shadowsThemed.float,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.statsTitle, { color: colors.text }]}>Бонусный баланс</Text>
      <Text style={[styles.bonusValue, { color: colors.primary }]}>{loyaltyPoints ?? 0} баллов</Text>
      {showGuestLoyalty ? (
        <View style={styles.guestLoyaltyBlock}>
          {visitCount != null && Number.isFinite(Number(visitCount)) ? (
            <Text style={[styles.guestLoyaltyLine, { color: colors.textLight }]}>
              Посещения (учёт на сервере, растут после оплаты заказа): {visitCount}.
            </Text>
          ) : null}
          {discountPercentage != null ? (
            <Text style={[styles.guestLoyaltyLine, { color: colors.textLight }]}>
              {Number(discountPercentage) > 0
                ? `Персональная скидка: ${Number(discountPercentage)}%.`
                : 'Персональная скидка: 0% (накопите визиты/заказы).'}
            </Text>
          ) : null}
          {registrationDate ? (
            <Text style={[styles.guestLoyaltyLine, { color: colors.textMuted }]}>Регистрация: {registrationDate}</Text>
          ) : null}
        </View>
      ) : null}
      {hasXpData ? (
        <>
          <Text style={[styles.xpValue, { color: colors.info }]}>Опыт: {xpPoints} XP • Уровень: {loyaltyLevel}</Text>
          <View style={[styles.progressBackground, { backgroundColor: colors.background }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary }]} />
          </View>
        </>
      ) : null}
      <Text style={[styles.progressLabel, { color: colors.textLight }]}>1 балл = 1 рубль. Списание до 50% чека.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statsTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  bonusValue: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  xpValue: {
    ...typography.caption,
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  progressBackground: {
    height: 8,
    borderRadius: borderRadius.round,
    marginBottom: spacing.sm,
  },
  progressFill: {
    width: '72%',
    height: '100%',
    borderRadius: borderRadius.round,
  },
  progressLabel: {
    ...typography.caption,
  },
  guestLoyaltyBlock: {
    marginBottom: spacing.sm,
    gap: 2,
  },
  guestLoyaltyLine: {
    ...typography.caption,
    lineHeight: 18,
  },
});
