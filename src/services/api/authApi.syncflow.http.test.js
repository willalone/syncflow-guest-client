jest.mock('../syncflowHttp', () => ({
  apiBase: jest.fn(() => 'http://test/api'),
  syncflowPublicRequest: jest.fn(),
  syncflowGuestRequest: jest.fn(),
}));

jest.mock('../authSessionStorage', () => ({
  readAuthSession: jest.fn(),
  writeAuthSession: jest.fn(),
}));

import { RECOVERY_NETWORK_RETRIES, RECOVERY_TIMEOUT_MS } from '../../constants/passwordRecovery';
import { readAuthSession, writeAuthSession } from '../authSessionStorage';
import { syncflowGuestRequest, syncflowPublicRequest } from '../syncflowHttp';
import {
  confirmPasswordRecovery,
  deleteAccount,
  requestPasswordRecovery,
  signIn,
  signUp,
  updateAccount,
} from './authApi.syncflow.http';

function makeToken(payload) {
  const body = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `hdr.${body}.sig`;
}

describe('authApi.syncflow.http', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('signIn maps tokens and user from JWT', async () => {
    const accessToken = makeToken({ sub: '99' });
    syncflowPublicRequest.mockResolvedValue({
      accessToken,
      refreshToken: 'refresh',
    });
    const session = await signIn({ login: 'guest@test.ru', password: 'pass' });
    expect(syncflowPublicRequest).toHaveBeenCalledWith('/guest/auth/login', expect.objectContaining({
      method: 'POST',
    }));
    expect(session.user.id).toBe('99');
    expect(session.user.login).toBe('guest@test.ru');
    expect(session.token).toBe(accessToken);
  });

  test('signUp uses login fallback when tokens missing', async () => {
    syncflowPublicRequest
      .mockResolvedValueOnce({ id: 5, login: 'u@x.ru' })
      .mockResolvedValueOnce({ accessToken: makeToken({ sub: '5' }), refreshToken: 'r' });
    const session = await signUp({
      firstName: 'A',
      lastName: 'B',
      login: 'u@x.ru',
      password: 'secret',
    });
    expect(session.user.id).toBe('5');
    expect(session.accessToken).toBeTruthy();
  });

  test('requestPasswordRecovery normalizes email and timeout', async () => {
    syncflowPublicRequest.mockResolvedValue({ message: 'sent' });
    await requestPasswordRecovery({ email: '  User@MAIL.ru  ' });
    expect(syncflowPublicRequest).toHaveBeenCalledWith(
      '/guest/auth/reset-password/request',
      expect.objectContaining({
        body: JSON.stringify({ email: 'user@mail.ru' }),
        timeoutMs: RECOVERY_TIMEOUT_MS,
        networkRetries: RECOVERY_NETWORK_RETRIES,
      }),
    );
  });

  test('confirmPasswordRecovery sends code and password', async () => {
    syncflowPublicRequest.mockResolvedValue({ message: 'ok' });
    await confirmPasswordRecovery({
      email: 'u@x.ru',
      code: ' 123456 ',
      newPassword: 'newpass',
    });
    expect(syncflowPublicRequest).toHaveBeenCalledWith(
      '/guest/auth/reset-password/confirm',
      expect.objectContaining({
        body: JSON.stringify({
          email: 'u@x.ru',
          code: '123456',
          newPassword: 'newpass',
        }),
      }),
    );
  });

  test('updateAccount patches profile and session', async () => {
    readAuthSession.mockResolvedValue({ token: 't', user: { id: '1', login: 'old' } });
    syncflowGuestRequest
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 1, login: 'new', firstName: 'N' });
    const user = await updateAccount('1', { firstName: 'N', login: 'new' });
    expect(user.login).toBe('new');
    expect(writeAuthSession).toHaveBeenCalled();
  });

  test('deleteAccount calls DELETE profile', async () => {
    syncflowGuestRequest.mockResolvedValue(true);
    await expect(deleteAccount()).resolves.toBe(true);
    expect(syncflowGuestRequest).toHaveBeenCalledWith('/guest/profile', expect.objectContaining({
      method: 'DELETE',
    }));
  });
});
