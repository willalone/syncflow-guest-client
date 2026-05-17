import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, getColors, getShadows, layout, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import ScreenBackdrop from '../components/ScreenBackdrop';

export default function NotificationsScreen({
  notifications = [],
  onBack,
  onOpenNotification,
  onMarkAllRead,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const shadows = getShadows(isDarkMode);

  return (
    <ScreenBackdrop isDarkMode={isDarkMode}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>Уведомления</Text>
            {notifications.some((n) => n.read !== true) ? (
              <TouchableOpacity onPress={() => onMarkAllRead?.()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.markAllText, { color: colors.primaryDark }]}>Прочитать все</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Уведомлений пока нет</Text>}
          onEndReachedThreshold={0.35}
          onEndReached={() => {
            if (hasMore && !isLoadingMore) onLoadMore?.();
          }}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                onPress={onLoadMore}
                disabled={isLoadingMore}
                style={[styles.loadMoreBtn, shadows.small, { borderColor: colors.hairline, backgroundColor: colors.card }]}
              >
                <Text style={[styles.loadMoreText, { color: colors.text }]}>
                  {isLoadingMore ? 'Загрузка...' : 'Загрузить еще'}
                </Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onOpenNotification?.(item)}
              activeOpacity={0.88}
              style={[
                styles.card,
                shadows.float,
                {
                  backgroundColor: colors.card,
                  borderColor: item.read !== true ? colors.primary : colors.hairline,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.cardText, { color: colors.textLight }]}>{item.text}</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.sm, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h2, flex: 1, letterSpacing: -0.4 },
  markAllText: { ...typography.caption, fontWeight: '700' },
  list: { paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing['2xl'], gap: spacing.sm },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardTitle: { ...typography.body, fontWeight: '700', marginBottom: spacing.xs },
  cardText: { ...typography.caption, lineHeight: 18 },
  loadMoreBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  loadMoreText: { ...typography.body, fontWeight: '600' },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
});
