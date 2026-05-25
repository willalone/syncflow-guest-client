import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fontFamily, layout, spacing, typography } from '../../constants/theme';

export default function SectionHeader({ title, hint, actionLabel, onAction, colors, style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.titles}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {hint ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={12}>
          <Text style={[styles.action, { color: colors.primaryDark }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingX,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  titles: { flex: 1, gap: 2 },
  title: {
    ...typography.h3,
    fontFamily: fontFamily.sansBold,
    letterSpacing: -0.25,
  },
  hint: { ...typography.caption, letterSpacing: 0.2 },
  action: {
    ...typography.caption,
    fontFamily: fontFamily.sansBold,
  },
});
