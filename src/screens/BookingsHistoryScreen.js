import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, getColors, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function BookingsHistoryScreen({ bookings = [], onBack, onOpenBooking }) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [sortMode, setSortMode] = useState('desc');

  const preparedBookings = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => {
      const at = new Date(`${a.date || ''} ${a.time || '00:00'}`).getTime() || 0;
      const bt = new Date(`${b.date || ''} ${b.time || '00:00'}`).getTime() || 0;
      return sortMode === 'desc' ? bt - at : at - bt;
    });
    return sorted;
  }, [bookings, sortMode]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <Text style={[styles.backText, { color: colors.text }]}>← Назад</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Все бронирования</Text>
      </View>
      <View style={styles.controls}>
        <View style={styles.row}>
          {[
            { id: 'desc', label: 'Сначала новые' },
            { id: 'asc', label: 'Сначала старые' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSortMode(item.id)}
              style={[
                styles.chip,
                {
                  borderColor: colors.border,
                  backgroundColor: sortMode === item.id ? colors.primary : colors.card,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: sortMode === item.id ? colors.black : colors.text }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList
        data={preparedBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Бронирований пока нет</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!onOpenBooking}
            onPress={() => onOpenBooking?.(item)}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {item.date} в {item.time}
            </Text>
            <Text style={[styles.cardText, { color: colors.textLight }]}>
              Гостей: {item.people != null ? item.people : '—'} • Адрес: {item.address || '—'}
            </Text>
            <Text style={[styles.cardText, { color: colors.textLight }]}>
              Статус:{' '}
              {item.status === 'confirmed'
                ? 'Подтверждено'
                : item.status === 'created'
                  ? 'Ожидает подтверждения'
                  : item.status || 'не указан'}
            </Text>
            {item.preorder?.items?.length ? (
              <View style={{ marginTop: spacing.xs, gap: 4 }}>
                <Text style={[styles.cardText, { color: colors.text, fontWeight: '600' }]}>Предзаказ</Text>
                <Text style={[styles.cardText, { color: colors.textLight }]}>
                  Подача: {item.preorder.servingTime || item.time}
                </Text>
                <Text style={[styles.cardText, { color: colors.textLight }]}>
                  {item.preorder.items.map((row) => `${row.title} ×${row.quantity}`).join(', ')}
                </Text>
              </View>
            ) : null}
            {onOpenBooking ? (
              <Text style={[styles.openHint, { color: colors.primary }]}>Подробнее →</Text>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  controls: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  chipText: { ...typography.caption, fontWeight: '600' },
  back: { alignSelf: 'flex-start' },
  backText: { ...typography.body, fontWeight: '600' },
  title: { ...typography.h2 },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm },
  cardTitle: { ...typography.body, fontWeight: '700', marginBottom: spacing.xs },
  cardText: { ...typography.caption },
  openHint: { ...typography.caption, fontWeight: '700', marginTop: spacing.sm },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
});
