import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, getColors, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function OrdersHistoryScreen({
  orders = [],
  onBack,
  onPayOrder,
  onSubmitReview,
  onActionError,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [reviewState, setReviewState] = useState({});

  const setReviewValue = (orderId, key, value) => {
    setReviewState((prev) => ({ ...prev, [orderId]: { ...(prev[orderId] || {}), [key]: value } }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <Text style={[styles.backText, { color: colors.text }]}>← Назад</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Все заказы</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Заказов пока нет</Text>}
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
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.titleRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Сумма: {item.total} руб.</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: item.paymentStatus === 'paid' ? `${colors.success}22` : `${colors.warning}22`,
                    borderColor: item.paymentStatus === 'paid' ? colors.success : colors.warning,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: item.paymentStatus === 'paid' ? colors.success : colors.warning },
                  ]}
                >
                  {item.paymentStatus === 'paid' ? 'Оплачен' : 'Ожидание оплаты'}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardText, { color: colors.textLight }]}>
              Тип: {item.orderType === 'delivery' ? 'Доставка' : item.orderType === 'pickup' ? 'Самовывоз' : 'Бронирование'}
            </Text>
            <Text style={[styles.cardText, { color: colors.textLight }]}>
              Списано: {item.bonusSpent || 0} • Начислено: +{item.bonusEarned || 0}
            </Text>
            <Text style={[styles.cardText, { color: colors.textLight }]}>XP: +{item.xpEarned || 0}</Text>
            <Text style={[styles.cardText, { color: colors.textLight }]}>
              Оплата: {item.paymentStatus === 'paid' ? 'Оплачено' : 'Ожидает оплаты'}
            </Text>
            {item.scheduledAt ? (
              <Text style={[styles.cardText, { color: colors.textLight }]}>Предзаказ к времени: {item.scheduledAt}</Text>
            ) : null}
            <Text style={[styles.cardText, { color: colors.textLight }]}>
              {(item.items || []).map((row) => `${row.title} x${row.quantity}`).join(', ')}
            </Text>
            {item.paymentStatus !== 'paid' ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  try {
                    await onPayOrder?.(item.id);
                  } catch (error) {
                    onActionError?.(error?.message || 'Не удалось оплатить заказ. Повторите попытку.');
                  }
                }}
              >
                <Text style={[styles.actionText, { color: colors.black }]}>Оплатить заказ</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.reviewWrap}>
              <TextInput
                value={String(reviewState[item.id]?.rating || '')}
                onChangeText={(value) => setReviewValue(item.id, 'rating', value.replace(/\D/g, '').slice(0, 1))}
                keyboardType="numeric"
                placeholder="Оценка 1-5"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              />
              <TextInput
                value={String(reviewState[item.id]?.comment || '')}
                onChangeText={(value) => setReviewValue(item.id, 'comment', value)}
                placeholder="Комментарий к заказу"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              />
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: item.reviewed ? colors.border : colors.primary }]}
                disabled={Boolean(item.reviewed)}
                onPress={async () => {
                  const firstItemId = item?.items?.[0]?.id;
                  const numericMenuItemId = Number(firstItemId);
                  if (!Number.isFinite(numericMenuItemId)) {
                    onActionError?.('Невозможно отправить отзыв: в заказе не найдена позиция меню');
                    return;
                  }
                  const ratingRaw = Number(reviewState[item.id]?.rating || 5);
                  try {
                    await onSubmitReview?.(item.id, {
                      rating: Math.max(1, Math.min(5, ratingRaw)),
                      comment: String(reviewState[item.id]?.comment || ''),
                      menuItemId: numericMenuItemId,
                    });
                  } catch (error) {
                    onActionError?.(error?.message || 'Не удалось отправить отзыв. Попробуйте снова.');
                  }
                }}
              >
                <Text style={[styles.actionText, { color: item.reviewed ? colors.textMuted : colors.black }]}>
                  {item.reviewed ? 'Отзыв отправлен' : 'Оставить отзыв'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  back: { alignSelf: 'flex-start' },
  backText: { ...typography.body, fontWeight: '600' },
  title: { ...typography.h2 },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { ...typography.body, fontWeight: '700', marginBottom: spacing.xs },
  cardText: { ...typography.caption },
  statusBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.xs,
  },
  statusBadgeText: { ...typography.caption, fontWeight: '700' },
  actionBtn: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  actionText: { ...typography.caption, fontWeight: '700' },
  reviewWrap: { marginTop: spacing.sm, gap: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...typography.caption,
  },
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
