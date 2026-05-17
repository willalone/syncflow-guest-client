import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  CLIENT_AUTH_STORAGE_KEY,
  patchAuthSession,
  readAuthSession,
  subscribeAuthSession,
  writeAuthSession,
} from './authSessionStorage';

describe('authSessionStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await writeAuthSession(null);
  });

  test('read returns null when empty', async () => {
    expect(await readAuthSession()).toBeNull();
  });

  test('write tokens to SecureStore and user to AsyncStorage', async () => {
    const session = {
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      user: { id: '1', login: 'u@test.ru' },
    };
    await writeAuthSession(session);
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
    const stored = await readAuthSession();
    expect(stored.accessToken).toBe('access-1');
    expect(stored.refreshToken).toBe('refresh-1');
    expect(stored.user.login).toBe('u@test.ru');
  });

  test('write null clears secure and async keys', async () => {
    await writeAuthSession({ accessToken: 'x', refreshToken: 'r', user: { id: '1' } });
    await writeAuthSession(null);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    expect(await readAuthSession()).toBeNull();
  });

  test('migrates legacy AsyncStorage session blob', async () => {
    const legacy = {
      accessToken: 'legacy-a',
      refreshToken: 'legacy-r',
      user: { id: '9' },
    };
    await AsyncStorage.setItem(CLIENT_AUTH_STORAGE_KEY, JSON.stringify(legacy));
    const session = await readAuthSession();
    expect(session.accessToken).toBe('legacy-a');
    expect(await AsyncStorage.getItem(CLIENT_AUTH_STORAGE_KEY)).toBeNull();
  });

  test('subscribeAuthSession fires on write', async () => {
    const listener = jest.fn();
    const unsub = subscribeAuthSession(listener);
    await writeAuthSession({ accessToken: 't', refreshToken: 'r', user: { id: '1' } });
    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0].accessToken).toBe('t');
    unsub();
  });

  test('identical writeAuthSession does not notify listeners twice', async () => {
    const listener = jest.fn();
    const unsub = subscribeAuthSession(listener);
    const session = { accessToken: 't', refreshToken: 'r', user: { id: '1', login: 'u' } };
    await writeAuthSession(session);
    await writeAuthSession({ ...session });
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  test('patchAuthSession merges partial', async () => {
    await writeAuthSession({ accessToken: 'a', refreshToken: 'r', user: { id: '1', login: 'u' } });
    const next = await patchAuthSession({ user: { id: '1', login: 'u', email: 'e@x.ru' } });
    expect(next.user.email).toBe('e@x.ru');
    expect(next.accessToken).toBe('a');
  });
});
