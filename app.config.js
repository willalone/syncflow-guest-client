/**
 * Конфигурация Expo для dev / preview / production (EAS Build).
 * Секреты и URL API — через переменные окружения (см. .env.example).
 */
const appJson = require('./app.json');

function envBool(name, fallback) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return fallback;
  return String(raw).toLowerCase() === 'true';
}

function envString(name, fallback) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return fallback;
  return String(raw).trim();
}

const buildProfile = process.env.EAS_BUILD_PROFILE || process.env.APP_VARIANT || 'development';
const isProductionBuild = buildProfile === 'production';

const baseExtra = appJson.expo.extra || {};
const apiBaseUrl = envString('EXPO_PUBLIC_API_BASE_URL', baseExtra.apiBaseUrl || 'http://127.0.0.1:3000/api');
const integratedBackend = envString('EXPO_PUBLIC_INTEGRATED_BACKEND', baseExtra.integratedBackend || 'syncflow');
const restaurantId = envString('EXPO_PUBLIC_RESTAURANT_ID', baseExtra.restaurantId || '');
const useMockApi = envBool('EXPO_PUBLIC_USE_MOCK_API', baseExtra.useMockApi === true);
const allowInsecureApi = envBool('EXPO_PUBLIC_ALLOW_INSECURE_API', baseExtra.allowInsecureApi === true);

const usesHttp = /^http:\/\//i.test(apiBaseUrl);
const allowCleartext = !isProductionBuild || allowInsecureApi || usesHttp;

function iosAtsForUrl(url) {
  if (!/^http:\/\//i.test(url)) {
    return {
      NSAllowsLocalNetworking: true,
    };
  }
  try {
    const host = new URL(url).hostname;
    return {
      NSAllowsLocalNetworking: true,
      NSExceptionDomains: {
        [host]: {
          NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
          NSIncludesSubdomains: false,
        },
      },
    };
  } catch {
    return { NSAllowsLocalNetworking: true };
  }
}

module.exports = {
  expo: {
    ...appJson.expo,
    version: appJson.expo.version || '1.0.0',
    ios: {
      ...appJson.expo.ios,
      infoPlist: {
        ...appJson.expo.ios?.infoPlist,
        NSAppTransportSecurity: iosAtsForUrl(apiBaseUrl),
      },
    },
    android: {
      ...appJson.expo.android,
      usesCleartextTraffic: allowCleartext,
    },
    extra: {
      ...baseExtra,
      apiBaseUrl,
      integratedBackend,
      restaurantId: restaurantId || null,
      useMockApi,
      allowInsecureApi,
      buildProfile,
      enableProductionChecks: isProductionBuild,
    },
  },
};
