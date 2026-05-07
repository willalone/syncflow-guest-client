import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { getColors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const checklists = [
  {
    id: 1,
    title: 'Открытие смены',
    items: [
      { id: 1, text: 'Проверить чистоту зала', completed: false },
      { id: 2, text: 'Проверить наличие меню', completed: false },
      { id: 3, text: 'Проверить работу POS-системы', completed: false },
      { id: 4, text: 'Проверить наличие салфеток и приборов', completed: false },
    ],
  },
  {
    id: 2,
    title: 'Ежедневные проверки',
    items: [
      { id: 1, text: 'Проверить температуру холодильников', completed: false },
      { id: 2, text: 'Проверить сроки годности продуктов', completed: false },
      { id: 3, text: 'Проверить работу оборудования', completed: false },
    ],
  },
];

export default function ChecklistsScreen() {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [checklistData, setChecklistData] = useState(checklists);

  const toggleItem = (checklistId, itemId) => {
    setChecklistData((prev) =>
      prev.map((checklist) =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: checklist.items.map((item) =>
                item.id === itemId
                  ? { ...item, completed: !item.completed }
                  : item
              ),
            }
          : checklist
      )
    );
  };

  const getProgress = (checklist) => {
    const completed = checklist.items.filter((item) => item.completed).length;
    return (completed / checklist.items.length) * 100;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Чек-листы</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {checklistData.map((checklist) => {
          const progress = getProgress(checklist);
          return (
            <View
              key={checklist.id}
              style={[styles.checklistCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.checklistHeader}>
                <Text style={[styles.checklistTitle, { color: colors.text }]}>
                  {checklist.title}
                </Text>
                <Text style={[styles.checklistProgress, { color: colors.primary }]}>
                  {Math.round(progress)}%
                </Text>
              </View>

              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress}%`,
                      backgroundColor: colors.secondary,
                    },
                  ]}
                />
              </View>

              {checklist.items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.checklistItem}
                  onPress={() => toggleItem(checklist.id, item.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: item.completed ? colors.secondary : 'transparent',
                        borderColor: item.completed ? colors.secondary : colors.border,
                      },
                    ]}
                  >
                    {item.completed && (
                      <Text style={[styles.checkmark, { color: colors.white }]}>✓</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.checklistItemText,
                      {
                        color: item.completed ? colors.textLight : colors.text,
                        textDecorationLine: item.completed ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {item.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </ScrollView>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  checklistCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...shadows.medium,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checklistTitle: {
    ...typography.h3,
  },
  checklistProgress: {
    ...typography.h4,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  checklistItemText: {
    ...typography.body,
    flex: 1,
  },
});

