import AsyncStorage from '@react-native-async-storage/async-storage';
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
  });

  test('read returns null when empty', async () => {
    expect(await readAuthSession()).toBeNull();
  });

  test('write and read roundtrip', async () => {
    const session = { token: 't1', user: { id: '1' } };
    await writeAuthSession(session);
    expect(await readAuthSession()).toEqual(session);
  });

  test('write null clears storage', async () => {
    await writeAuthSession({ token: 'x' });
    await writeAuthSession(null);
    expect(await AsyncStorage.getItem(CLIENT_AUTH_STORAGE_KEY)).toBeNull();
  });

  test('subscribeAuthSession fires on write', async () => {
    const listener = jest.fn();
    const unsub = subscribeAuthSession(listener);
    await writeAuthSession({ token: 't' });
    expect(listener).toHaveBeenCalledWith({ token: 't' });
    unsub();
  });

  test('patchAuthSession merges partial', async () => {
    await writeAuthSession({ token: 'a', user: { id: '1', login: 'u' } });
    const next = await patchAuthSession({ user: { id: '1', login: 'u', email: 'e@x.ru' } });
    expect(next.user.email).toBe('e@x.ru');
    expect(next.token).toBe('a');
  });
});
