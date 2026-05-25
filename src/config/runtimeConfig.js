import Constants from 'expo-constants';

const extra = Constants?.expoConfig?.extra || {};

/** `syncflow` — общий бэкенд команды (API_DOCS.md); иначе локальный Express в /server. */
const integratedBackend = extra.integratedBackend === 'syncflow' ? 'syncflow' : 'local';

/** Явный ресторан для SyncFlow (`X-Restaurant-ID`). Пусто — поведение сервера по умолчанию. */
const restaurantId =
  extra.restaurantId != null && String(extra.restaurantId).trim() !== ''
    ? String(extra.restaurantId).trim()
    : null;

/** Статический каталог столов зала (id из SyncFlow), если гостю недоступен GET /tables. */
const hallTableCatalog = Array.isArray(extra.hallTableCatalog) ? extra.hallTableCatalog : [];

export const runtimeConfig = {
  /** Mock только при явном useMockApi: true (безопасно для production по умолчанию). */
  useMockApi: extra.useMockApi === true,
  apiBaseUrl: String(extra.apiBaseUrl || 'http://127.0.0.1:3000/api').trim(),
  integratedBackend,
  restaurantId,
  hallTableCatalog,
  enablePremiumTabGestures: extra.enablePremiumTabGestures === true,
  appOwnership: Constants?.appOwnership || 'unknown',
  buildProfile: String(extra.buildProfile || 'development'),
  /** EAS production profile — включает жёсткие проверки конфигурации. */
  enableProductionChecks: extra.enableProductionChecks === true,
  /** Staging с HTTP/IP: только если явно разрешено (не для store release). */
  allowInsecureApi: extra.allowInsecureApi === true,
  /** Прокси картинок /api/media/proxy есть только на локальном сервере проекта. */
  useBackendImageProxy: integratedBackend !== 'syncflow' && extra.useBackendImageProxy !== false,
  isReleaseBuild: !__DEV__,
};
