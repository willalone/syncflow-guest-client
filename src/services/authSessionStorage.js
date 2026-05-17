import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLIENT_AUTH_STORAGE_KEY = 'client_auth_session';

const sessionListeners = new Set();

/** Подписка на запись сессии (в т.ч. refresh токена в syncflowHttp). */
export function subscribeAuthSession(listener) {
  if (typeof listener !== 'function') return () => {};
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

function notifyAuthSession(session) {
  sessionListeners.forEach((listener) => {
    try {
      listener(session);
    } catch {
      // no-op
    }
  });
}

export async function readAuthSession() {
  try {
    const raw = await AsyncStorage.getItem(CLIENT_AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeAuthSession(session) {
  if (session == null) {
    await AsyncStorage.removeItem(CLIENT_AUTH_STORAGE_KEY);
    notifyAuthSession(null);
    return;
  }
  await AsyncStorage.setItem(CLIENT_AUTH_STORAGE_KEY, JSON.stringify(session));
  notifyAuthSession(session);
}

export async function patchAuthSession(partial) {
  const prev = (await readAuthSession()) || {};
  const next = { ...prev, ...partial };
  await writeAuthSession(next);
  return next;
}
