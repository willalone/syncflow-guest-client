import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, getColors, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const statusRu = (s) => {
  if (s === 'confirmed') return 'Подтверждено';
  if (s === 'created') return 'Ожидает подтверждения';
  if (s === 'cancelled') return 'Отменено';
  if (s === 'completed') return 'Завершено';
  return s || '—';
};

export default function BookingDetailScreen({ bookingId, initial, onBack, fetchBookingDetail }) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [detail, setDetail] = useState(initial || null);
  const [loading, setLoading] = useState(Boolean(fetchBookingDetail && bookingId));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!fetchBookingDetail || !bookingId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const next = await fetchBookingDetail(bookingId);
        if (!cancelled && next) setDetail(next);
      } catch {
        if (!cancelled) setDetail(initial || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [bookingId, fetchBookingDetail, initial]);

  const b = detail || initial;
  const raw = b?.raw;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <Text style={[styles.backText, { color: colors.text }]}>← Назад</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Бронирование</Text>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Дата и время</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>
              {b?.date} в {b?.time}
              {raw?.reservHourTo ? ` — ${String(raw.reservHourTo).slice(0, 5)}` : ''}
            </Text>
            <Text style={[styles.rowLabel, { color: colors.textMuted, marginTop: spacing.sm }]}>Статус</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>{statusRu(b?.status)}</Text>
            <Text style={[styles.rowLabel, { color: colors.textMuted, marginTop: spacing.sm }]}>Стол</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>
              №{b?.tableId || raw?.table?.id || '—'} • мест: {raw?.table?.seatCount ?? b?.people ?? '—'}
            </Text>
            {(b?.guestName || raw?.guestName) && (
              <>
                <Text style={[styles.rowLabel, { color: colors.textMuted, marginTop: spacing.sm }]}>Имя гостя</Text>
                <Text style={[styles.rowValue, { color: colors.text }]}>{raw?.guestName || b?.guestName}</Text>
              </>
            )}
            <Text style={[styles.hint, { color: colors.textLight, marginTop: spacing.md }]}>
              Информация обновляется при открытии экрана.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.xs },
  back: { alignSelf: 'flex-start' },
  backText: { ...typography.body, fontWeight: '600' },
  title: { ...typography.h2 },
  content: { padding: spacing.lg },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.lg, padding: spacing.md },
  rowLabel: { ...typography.caption, fontWeight: '600' },
  rowValue: { ...typography.body, marginTop: 2 },
  hint: { ...typography.caption },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
