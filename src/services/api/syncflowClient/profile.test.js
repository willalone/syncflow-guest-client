import { syncflowGuestRequest } from '../../syncflowHttp';
import { readAuthSession, writeAuthSession } from '../../authSessionStorage';
import { fetchUserProfile, resetProfileFetchCoalescing } from './profile';

jest.mock('../../syncflowHttp', () => ({
  syncflowGuestRequest: jest.fn(),
}));

jest.mock('../../authSessionStorage', () => ({
  readAuthSession: jest.fn(),
  writeAuthSession: jest.fn(),
}));

describe('syncflowClient/profile fetchUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetProfileFetchCoalescing();
    readAuthSession.mockResolvedValue({
      accessToken: 'a',
      user: {
        id: '7',
        firstName: 'A',
        lastName: 'B',
        login: 'guest',
        email: 'g@test.ru',
        phoneNumber: '',
      },
    });
    syncflowGuestRequest.mockImplementation((path) => {
      if (path === '/guest/profile') {
        return Promise.resolve({
          id: 7,
          firstName: 'A',
          lastName: 'B',
          login: 'guest',
          email: 'g@test.ru',
          bonusBalance: 100,
        });
      }
      if (path === '/bonus/my/balance') return Promise.resolve(100);
      return Promise.resolve(null);
    });
  });

  test('coalesces parallel fetches into one network round-trip', async () => {
    const [a, b] = await Promise.all([fetchUserProfile('7'), fetchUserProfile('7')]);
    expect(a.id).toBe('7');
    expect(b).toEqual(a);
    expect(syncflowGuestRequest).toHaveBeenCalledWith('/guest/profile');
    expect(syncflowGuestRequest.mock.calls.filter((c) => c[0] === '/guest/profile')).toHaveLength(1);
  });

  test('does not writeAuthSession when GET profile fails', async () => {
    syncflowGuestRequest.mockImplementation((path) => {
      if (path === '/guest/profile') {
        return Promise.reject(Object.assign(new Error('conflict'), { status: 409 }));
      }
      if (path === '/bonus/my/balance') return Promise.resolve(50);
      return Promise.resolve(null);
    });
    const profile = await fetchUserProfile('7');
    expect(profile.loyaltyPoints).toBe(50);
    expect(writeAuthSession).not.toHaveBeenCalled();
  });

  test('writeAuthSession skipped when session user already matches API', async () => {
    await fetchUserProfile('7');
    expect(writeAuthSession).not.toHaveBeenCalled();
  });
});
