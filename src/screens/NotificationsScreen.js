import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, getColors, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <Text style={[styles.backText, { color: colors.text }]}>← Назад</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Все уведомления</Text>
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
              style={[styles.loadMoreBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
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
            activeOpacity={0.8}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: item.read !== true ? colors.primaryDark : colors.border,
                borderLeftWidth: item.read !== true ? 3 : 1,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.cardText, { color: colors.textLight }]}>{item.text}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  back: { alignSelf: 'flex-start' },
  backText: { ...typography.body, fontWeight: '600' },
  title: { ...typography.h2, flex: 1 },
  markAllText: { ...typography.caption, fontWeight: '700' },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm },
  cardTitle: { ...typography.body, fontWeight: '700', marginBottom: spacing.xs },
  cardText: { ...typography.caption },
  loadMoreBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  loadMoreText: { ...typography.body, fontWeight: '600' },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
});
