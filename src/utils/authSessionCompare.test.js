import { authUserFieldsEqual, sessionPersistenceKey } from './authSessionCompare';

describe('authSessionCompare', () => {
  test('sessionPersistenceKey is stable for equivalent sessions', () => {
    const a = { accessToken: 't', refreshToken: 'r', user: { id: '1', login: 'u' } };
    const b = { token: 't', refreshToken: 'r', user: { id: '1', login: 'u' } };
    expect(sessionPersistenceKey(a)).toBe(sessionPersistenceKey(b));
  });

  test('authUserFieldsEqual compares profile fields', () => {
    expect(authUserFieldsEqual({ id: '1', email: 'a' }, { id: '1', email: 'a' })).toBe(true);
    expect(authUserFieldsEqual({ id: '1', email: 'a' }, { id: '1', email: 'b' })).toBe(false);
  });
});
