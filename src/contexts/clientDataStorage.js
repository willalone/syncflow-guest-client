import AsyncStorage from '@react-native-async-storage/async-storage';
import { userScopedCacheKey } from './clientDataUtils';

export async function cleanupLegacyMockState(userId) {
  const keysToRemove = [
    `client_bookings_${userId}`,
    `client_orders_${userId}`,
    `client_profile_${userId}`,
    `client_favorites_${userId}`,
    `client_notifications_${userId}`,
    userScopedCacheKey(userId),
  ];
  await AsyncStorage.multiRemove(keysToRemove);
}

export async function readJson(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function writeJson(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op cache write failure
  }
}

/** Дописывает поля в кэш профиля/заказов/избранного для офлайн-возврата в приложение. */
export async function patchUserScopeCache(userId, partial) {
  if (!userId || userId === 'guest') return;
  const key = userScopedCacheKey(userId);
  const prev = (await readJson(key)) || { data: {} };
  await writeJson(key, {
    updatedAt: Date.now(),
    data: { ...(prev.data || {}), ...partial },
  });
}
