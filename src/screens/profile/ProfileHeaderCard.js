import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, spacing, typography } from '../../constants/theme';

export default function ProfileHeaderCard({ colors, shadowsThemed, fullName, role }) {
  return (
    <View
      style={[
        styles.profileCard,
        shadowsThemed.float,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, shadowsThemed.small, { backgroundColor: colors.cardElevated }]}>
          <Text style={[styles.avatarText, { color: colors.primaryDark }]}>ИИ</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>{fullName || '—'}</Text>
          {role ? <Text style={[styles.profileRole, { color: colors.textLight }]}>{role}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  avatarText: {
    ...typography.h3,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  profileRole: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
});
