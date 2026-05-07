import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLIENT_AUTH_STORAGE_KEY = 'client_auth_session';

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
    return;
  }
  await AsyncStorage.setItem(CLIENT_AUTH_STORAGE_KEY, JSON.stringify(session));
}

export async function patchAuthSession(partial) {
  const prev = (await readAuthSession()) || {};
  const next = { ...prev, ...partial };
  await writeAuthSession(next);
  return next;
}
