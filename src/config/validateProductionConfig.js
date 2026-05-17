import { runtimeConfig } from './runtimeConfig';

/**
 * Проверки конфигурации перед release-сборкой (EAS production).
 * В __DEV__ не блокирует — только предупреждения в лог.
 */
export function getProductionConfigIssues(config = runtimeConfig) {
  const issues = [];
  const url = String(config.apiBaseUrl || '').trim();

  if (!url) {
    issues.push('Не задан EXPO_PUBLIC_API_BASE_URL (apiBaseUrl в expo.extra).');
  }

  if (config.useMockApi) {
    issues.push('Mock API включён (useMockApi). Для production задайте EXPO_PUBLIC_USE_MOCK_API=false.');
  }

  if (config.integratedBackend === 'syncflow' && !config.restaurantId) {
    issues.push('Для SyncFlow укажите EXPO_PUBLIC_RESTAURANT_ID (заголовок X-Restaurant-ID).');
  }

  const mustUseHttps = config.enableProductionChecks && !config.allowInsecureApi;
  if (mustUseHttps && url && !/^https:\/\//i.test(url)) {
    issues.push(
      'Production требует HTTPS API. Задайте EXPO_PUBLIC_API_BASE_URL=https://… или только для staging: EXPO_PUBLIC_ALLOW_INSECURE_API=true.',
    );
  }

  return issues;
}

export function isProductionConfigValid(config = runtimeConfig) {
  return getProductionConfigIssues(config).length === 0;
}

/** Блокировать UI только в release-сборке с включёнными проверками. */
export function shouldBlockAppForConfig(config = runtimeConfig) {
  if (__DEV__) return false;
  if (!config.enableProductionChecks) return false;
  return !isProductionConfigValid(config);
}
