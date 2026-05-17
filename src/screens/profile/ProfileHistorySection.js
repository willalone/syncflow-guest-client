import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, spacing, typography } from '../../constants/theme';

export default function ProfileHistorySection({ colors, title, actionLabel = 'Смотреть все', onOpen, children, meta }) {
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        <TouchableOpacity onPress={onOpen}>
          <Text style={[styles.linkText, { color: colors.primaryDark }]}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
      {meta ? <Text style={[styles.sectionMeta, { color: colors.textLight }]}>{meta}</Text> : null}
      {children}
    </View>
  );
}

export function ProfileHistoryCard({ colors, children }) {
  return <View style={[styles.historyCard, { borderColor: colors.border, backgroundColor: colors.backgroundLight }]}>{children}</View>;
}

const styles = StyleSheet.create({
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { ...typography.caption, fontWeight: '700' },
  sectionMeta: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  historyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
});
