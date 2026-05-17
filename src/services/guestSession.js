import { runtimeConfig } from '../config/runtimeConfig';
import { readAuthSession } from './authSessionStorage';
import { refreshGuestAccess } from './syncflowHttp';

/**
 * Восстановление сессии при старте: читает AsyncStorage, при SyncFlow пробует refresh.
 * При ошибке сети возвращает сохранённую сессию — пользователь остаётся «в аккаунте» с кэшем.
 */
export async function hydrateStoredGuestSession() {
  const stored = await readAuthSession();
  if (!stored) return null;
  if (runtimeConfig.integratedBackend !== 'syncflow' || !stored.refreshToken) {
    return stored;
  }
  try {
    return await refreshGuestAccess();
  } catch {
    return stored;
  }
}
