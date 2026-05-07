import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { getColors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const tableSize = (width - spacing.lg * 2 - spacing.md * 3) / 4;

// Моковые данные столов
const tables = [
  { id: 1, number: 1, status: 'free', guests: 0, time: null },
  { id: 2, number: 2, status: 'occupied', guests: 4, time: 45 },
  { id: 3, number: 3, status: 'reserved', guests: 2, time: null },
  { id: 4, number: 4, status: 'free', guests: 0, time: null },
  { id: 5, number: 5, status: 'waiting', guests: 3, time: 15 },
  { id: 6, number: 6, status: 'occupied', guests: 2, time: 30 },
  { id: 7, number: 7, status: 'free', guests: 0, time: null },
  { id: 8, number: 8, status: 'occupied', guests: 6, time: 60 },
  { id: 9, number: 9, status: 'free', guests: 0, time: null },
  { id: 10, number: 10, status: 'reserved', guests: 4, time: null },
  { id: 11, number: 11, status: 'free', guests: 0, time: null },
  { id: 12, number: 12, status: 'occupied', guests: 2, time: 20 },
];

export default function TablesScreen() {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [selectedTable, setSelectedTable] = useState(null);

  const getTableColor = (status) => {
    switch (status) {
      case 'free':
        return colors.tableFree;
      case 'occupied':
        return colors.tableOccupied;
      case 'reserved':
        return colors.tableReserved;
      case 'waiting':
        return colors.tableWaiting;
      default:
        return colors.border;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'free':
        return 'Свободен';
      case 'occupied':
        return 'Занят';
      case 'reserved':
        return 'Бронь';
      case 'waiting':
        return 'Ожидает';
      default:
        return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Карта столов</Text>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: colors.tableFree }]} />
            <Text style={[styles.statText, { color: colors.textLight }]}>Свободен</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: colors.tableOccupied }]} />
            <Text style={[styles.statText, { color: colors.textLight }]}>Занят</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: colors.tableReserved }]} />
            <Text style={[styles.statText, { color: colors.textLight }]}>Бронь</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.tablesGrid}>
          {tables.map((table) => (
            <TouchableOpacity
              key={table.id}
              style={[
                styles.tableCard,
                {
                  backgroundColor: getTableColor(table.status),
                  borderColor: selectedTable === table.id ? colors.primary : 'transparent',
                  borderWidth: selectedTable === table.id ? 3 : 0,
                },
              ]}
              onPress={() => setSelectedTable(table.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tableNumber, { color: colors.white }]}>
                {table.number}
              </Text>
              {table.status === 'occupied' && (
                <>
                  <Text style={[styles.tableGuests, { color: colors.white }]}>
                    {table.guests} чел.
                  </Text>
                  <Text style={[styles.tableTime, { color: colors.white }]}>
                    {table.time} мин
                  </Text>
                </>
              )}
              {table.status === 'reserved' && (
                <Text style={[styles.tableStatus, { color: colors.white }]}>
                  Бронь
                </Text>
              )}
              {table.status === 'waiting' && (
                <Text style={[styles.tableStatus, { color: colors.white }]}>
                  Ожидает
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {selectedTable && (
        <View style={[styles.tableDetails, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Text style={[styles.detailsTitle, { color: colors.text }]}>
            Стол #{tables.find((t) => t.id === selectedTable)?.number}
          </Text>
          <Text style={[styles.detailsStatus, { color: colors.textLight }]}>
            Статус: {getStatusLabel(tables.find((t) => t.id === selectedTable)?.status)}
          </Text>
          {tables.find((t) => t.id === selectedTable)?.guests > 0 && (
            <Text style={[styles.detailsText, { color: colors.textLight }]}>
              Гостей: {tables.find((t) => t.id === selectedTable)?.guests}
            </Text>
          )}
          {tables.find((t) => t.id === selectedTable)?.time && (
            <Text style={[styles.detailsText, { color: colors.textLight }]}>
              Время: {tables.find((t) => t.id === selectedTable)?.time} минут
            </Text>
          )}
          <View style={styles.detailsActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => setSelectedTable(null)}
            >
              <Text style={[styles.actionButtonText, { color: colors.white }]}>
                Детали
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.secondary }]}
              onPress={() => setSelectedTable(null)}
            >
              <Text style={[styles.actionButtonText, { color: colors.white }]}>
                Чек
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    ...shadows.small,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statText: {
    ...typography.caption,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tableCard: {
    width: tableSize,
    height: tableSize,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  tableNumber: {
    ...typography.h2,
    fontWeight: '700',
  },
  tableGuests: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  tableTime: {
    ...typography.caption,
    fontSize: 10,
  },
  tableStatus: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  tableDetails: {
    padding: spacing.lg,
    borderTopWidth: 1,
    ...shadows.large,
  },
  detailsTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  detailsStatus: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  detailsText: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  detailsActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.small,
  },
  actionButtonText: {
    ...typography.button,
  },
});

