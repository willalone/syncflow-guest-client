import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { sessionPersistenceKey } from '../utils/authSessionCompare';

/** @deprecated legacy single-key blob; migrated on read */
export const CLIENT_AUTH_STORAGE_KEY = 'client_auth_session';

const USER_KEY = 'client_auth_user';
const TOKENS_SECURE_KEY = 'client_auth_tokens';

const sessionListeners = new Set();
let lastPersistedSessionKey = null;

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

async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function secureGet(key) {
  if (!(await isSecureStoreAvailable())) {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureSet(key, value) {
  if (!(await isSecureStoreAvailable())) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key) {
  if (!(await isSecureStoreAvailable())) {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

function pickTokens(session) {
  if (!session) return null;
  const accessToken = session.accessToken ?? session.token ?? null;
  if (!accessToken && !session.refreshToken) return null;
  return {
    accessToken,
    refreshToken: session.refreshToken ?? null,
    token: accessToken,
  };
}

async function readTokens() {
  try {
    const raw = await secureGet(TOKENS_SECURE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeTokens(tokens) {
  if (!tokens) {
    await secureDelete(TOKENS_SECURE_KEY);
    return;
  }
  await secureSet(TOKENS_SECURE_KEY, JSON.stringify(tokens));
}

async function readUserBlob() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeUserBlob(user) {
  if (!user) {
    await AsyncStorage.removeItem(USER_KEY);
    return;
  }
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function migrateLegacySession() {
  try {
    const raw = await AsyncStorage.getItem(CLIENT_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    await writeAuthSession(session);
    await AsyncStorage.removeItem(CLIENT_AUTH_STORAGE_KEY);
    return session;
  } catch {
    return null;
  }
}

function mergeSession(tokens, user) {
  if (!tokens?.accessToken && !tokens?.token) return null;
  const safeUser = user && typeof user === 'object' ? user : {};
  return {
    ...tokens,
    user: safeUser,
    pushDeviceToken: safeUser.pushDeviceToken,
  };
}

export async function readAuthSession() {
  try {
    let tokens = await readTokens();
    let user = await readUserBlob();

    if (!tokens) {
      const legacy = await migrateLegacySession();
      if (legacy) {
        tokens = pickTokens(legacy);
        user = legacy.user || user;
      }
    }

    return mergeSession(tokens, user);
  } catch {
    return null;
  }
}

export async function writeAuthSession(session) {
  const nextKey = sessionPersistenceKey(session);
  if (nextKey === lastPersistedSessionKey) {
    return;
  }
  lastPersistedSessionKey = nextKey;

  if (session == null) {
    await writeTokens(null);
    await writeUserBlob(null);
    await AsyncStorage.removeItem(CLIENT_AUTH_STORAGE_KEY);
    notifyAuthSession(null);
    return;
  }

  const tokens = pickTokens(session);
  const user = {
    ...(session.user || {}),
    ...(session.pushDeviceToken != null ? { pushDeviceToken: session.pushDeviceToken } : {}),
  };

  await writeTokens(tokens);
  await writeUserBlob(user);
  await AsyncStorage.removeItem(CLIENT_AUTH_STORAGE_KEY);

  const merged = mergeSession(tokens, user);
  notifyAuthSession(merged);
}

export async function patchAuthSession(partial) {
  const prev = (await readAuthSession()) || {};
  const next = { ...prev, ...partial };
  if (partial.user) {
    next.user = { ...prev.user, ...partial.user };
  }
  await writeAuthSession(next);
  return next;
}
