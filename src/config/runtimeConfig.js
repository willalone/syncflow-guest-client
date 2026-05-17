import Constants from 'expo-constants';

const extra = Constants?.expoConfig?.extra || {};

/** `syncflow` — общий бэкенд команды (API_DOCS.md); иначе локальный Express в /server. */
const integratedBackend = extra.integratedBackend === 'syncflow' ? 'syncflow' : 'local';

/** Явный ресторан для SyncFlow (`X-Restaurant-ID`). Пусто — поведение сервера по умолчанию. */
const restaurantId =
  extra.restaurantId != null && String(extra.restaurantId).trim() !== ''
    ? String(extra.restaurantId).trim()
    : null;

export const runtimeConfig = {
  useMockApi: extra.useMockApi !== false,
  apiBaseUrl: extra.apiBaseUrl || 'http://127.0.0.1:3000/api',
  integratedBackend,
  restaurantId,
  enablePremiumTabGestures: extra.enablePremiumTabGestures === true,
  appOwnership: Constants?.appOwnership || 'unknown',
  /** Прокси картинок /api/media/proxy есть только на локальном сервере проекта. */
  useBackendImageProxy: integratedBackend !== 'syncflow' && extra.useBackendImageProxy !== false,
};
