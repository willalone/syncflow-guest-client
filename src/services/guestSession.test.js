jest.mock('./syncflowHttp', () => ({
  refreshGuestAccess: jest.fn(),
}));

jest.mock('../config/runtimeConfig', () => ({
  runtimeConfig: { integratedBackend: 'syncflow' },
}));

import { readAuthSession } from './authSessionStorage';
import { refreshGuestAccess } from './syncflowHttp';
import { hydrateStoredGuestSession } from './guestSession';

jest.mock('./authSessionStorage', () => ({
  readAuthSession: jest.fn(),
}));

describe('hydrateStoredGuestSession', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns null when nothing stored', async () => {
    readAuthSession.mockResolvedValue(null);
    await expect(hydrateStoredGuestSession()).resolves.toBeNull();
  });

  test('refreshes when refreshToken present', async () => {
    readAuthSession.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
    refreshGuestAccess.mockResolvedValue({ accessToken: 'new', refreshToken: 'r' });
    await expect(hydrateStoredGuestSession()).resolves.toEqual({
      accessToken: 'new',
      refreshToken: 'r',
    });
  });

  test('keeps stored session when refresh fails', async () => {
    const stored = { accessToken: 'a', refreshToken: 'r' };
    readAuthSession.mockResolvedValue(stored);
    refreshGuestAccess.mockRejectedValue(new Error('offline'));
    await expect(hydrateStoredGuestSession()).resolves.toBe(stored);
  });
});
