import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, getColors, getShadows, layout, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import ScreenBackdrop from '../components/ScreenBackdrop';
import { Ionicons } from '@expo/vector-icons';
import { formatRubles } from '../utils/money';

function isOrderPaid(item) {
  return (
    item?.paymentStatus === 'paid' ||
    ['paid', 'confirmed', 'completed', 'PAID', 'COMPLETED'].includes(String(item?.status || ''))
  );
}

export default function OrdersHistoryScreen({
  orders = [],
  onBack,
  onPayOrder,
  onSubmitReview,
  onActionError,
  onReviewSuccess,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const shadows = getShadows(isDarkMode);
  const [reviewState, setReviewState] = useState({});
  const [submittingReviewId, setSubmittingReviewId] = useState('');

  const setReviewValue = (orderId, key, value) => {
    setReviewState((prev) => ({ ...prev, [orderId]: { ...(prev[orderId] || {}), [key]: value } }));
  };

  return (
    <ScreenBackdrop isDarkMode={isDarkMode}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Заказы</Text>
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
          <View style={[styles.card, shadows.float, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
            <View style={styles.titleRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Сумма: {formatRubles(item.total)} ₽
              </Text>
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
            {item.isReservationPreorder ? (
              <Text style={[styles.cardText, { color: colors.textMuted }]}>
                Предзаказ к брони — оплатите при визите или оформите новый заказ в приложении.
              </Text>
            ) : null}
            {item.paymentStatus !== 'paid' && !item.isReservationPreorder ? (
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
            {isOrderPaid(item) && !item.isReservationPreorder ? (
              <View style={styles.reviewWrap}>
                <TextInput
                  value={String(reviewState[item.id]?.rating ?? (item.reviewed ? item.review?.rating : '') ?? '')}
                  onChangeText={(value) => setReviewValue(item.id, 'rating', value.replace(/\D/g, '').slice(0, 1))}
                  keyboardType="numeric"
                  placeholder="Оценка 1-5"
                  placeholderTextColor={colors.textMuted}
                  editable={!item.reviewed}
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: colors.background,
                      opacity: item.reviewed ? 0.65 : 1,
                    },
                  ]}
                />
                <TextInput
                  value={String(reviewState[item.id]?.comment ?? (item.reviewed ? item.review?.comment : '') ?? '')}
                  onChangeText={(value) => setReviewValue(item.id, 'comment', value)}
                  placeholder="Комментарий к заказу"
                  placeholderTextColor={colors.textMuted}
                  editable={!item.reviewed}
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: colors.background,
                      opacity: item.reviewed ? 0.65 : 1,
                    },
                  ]}
                />
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: item.reviewed ? colors.border : colors.primary,
                      opacity: item.reviewed || submittingReviewId === item.id ? 0.7 : 1,
                    },
                  ]}
                  disabled={Boolean(item.reviewed) || submittingReviewId === item.id}
                  onPress={async () => {
                    if (item.reviewed || submittingReviewId === item.id) return;
                    const firstItemId = item?.items?.[0]?.id;
                    const numericMenuItemId = Number(firstItemId);
                    if (!Number.isFinite(numericMenuItemId)) {
                      onActionError?.('Невозможно отправить отзыв: в заказе не найдена позиция меню');
                      return;
                    }
                    const ratingRaw = Number(reviewState[item.id]?.rating || 5);
                    setSubmittingReviewId(item.id);
                    try {
                      await onSubmitReview?.(item.id, {
                        rating: Math.max(1, Math.min(5, ratingRaw || 5)),
                        comment: String(reviewState[item.id]?.comment || ''),
                        menuItemId: numericMenuItemId,
                      });
                      onReviewSuccess?.();
                    } catch (error) {
                      onActionError?.(error?.message || 'Не удалось отправить отзыв. Попробуйте снова.');
                    } finally {
                      setSubmittingReviewId('');
                    }
                  }}
                >
                  <Text style={[styles.actionText, { color: item.reviewed ? colors.textMuted : colors.black }]}>
                    {item.reviewed
                      ? 'Отзыв отправлен'
                      : submittingReviewId === item.id
                        ? 'Отправляем...'
                        : 'Оставить отзыв'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      />
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h2, flex: 1, letterSpacing: -0.4 },
  list: { paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing['2xl'], gap: spacing.sm },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
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
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  actionText: { ...typography.caption, fontWeight: '700' },
  reviewWrap: { marginTop: spacing.sm, gap: spacing.xs },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...typography.caption,
  },
  loadMoreBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  loadMoreText: { ...typography.body, fontWeight: '600' },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
});
