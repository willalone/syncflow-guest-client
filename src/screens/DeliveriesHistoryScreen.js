import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, getColors, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function DeliveriesHistoryScreen({ deliveries = [], onBack }) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <Text style={[styles.backText, { color: colors.text }]}>← Назад</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Все доставки</Text>
      </View>
      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Доставок пока нет</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Заказ: {item.total} руб.</Text>
            <Text style={[styles.cardText, { color: colors.textLight }]}>
              Адрес: {item?.deliveryDetails?.city || 'город не указан'}, {item?.deliveryDetails?.addressLine || 'улица не указана'}
            </Text>
            <Text style={[styles.cardText, { color: colors.textLight }]}>
              Дом: {item?.deliveryDetails?.house || '—'} • Подъезд: {item?.deliveryDetails?.entrance || '—'} • Кв.: {item?.deliveryDetails?.apartment || '—'}
            </Text>
            <Text style={[styles.cardText, { color: colors.textLight }]}>
              Домофон: {item?.deliveryDetails?.intercom || '—'} • У двери: {item?.deliveryDetails?.leaveAtDoor ? 'да' : 'нет'}
            </Text>
            <Text style={[styles.cardText, { color: colors.textLight }]}>
              Статус: {item?.deliveryStatus || 'создано'}
            </Text>
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
  cardTitle: { ...typography.body, fontWeight: '700', marginBottom: spacing.xs },
  cardText: { ...typography.caption },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
});
