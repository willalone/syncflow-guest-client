import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { borderRadius, fontFamily, spacing, typography } from '../constants/theme';
import { getProductionConfigIssues } from '../config/validateProductionConfig';
import { runtimeConfig } from '../config/runtimeConfig';

/**
 * Блокирует приложение при неверной production-конфигурации (EAS production profile).
 */
export default function ProductionConfigGate({ children }) {
  const issues = getProductionConfigIssues();
  const blocked = issues.length > 0 && !__DEV__ && runtimeConfig.enableProductionChecks;

  if (!blocked) {
    return children;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Неверная конфигурация сборки</Text>
        <Text style={styles.lead}>
          Приложение собрано для production, но параметры окружения не прошли проверку. Исправьте переменные
          EAS / .env и пересоберите приложение.
        </Text>
        {issues.map((issue) => (
          <Text key={issue} style={styles.issue}>
            • {issue}
          </Text>
        ))}
        <Text style={styles.hint}>Текущий API: {runtimeConfig.apiBaseUrl || '—'}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1520',
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  title: {
    ...typography.h2,
    color: '#F7F2FB',
    fontFamily: fontFamily.sansBold,
    marginBottom: spacing.md,
  },
  lead: {
    ...typography.body,
    color: '#C8BED4',
    marginBottom: spacing.lg,
  },
  issue: {
    ...typography.body,
    color: '#FFB4B4',
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: '#8A8098',
    marginTop: spacing.lg,
    fontFamily: fontFamily.sansMedium,
  },
});
