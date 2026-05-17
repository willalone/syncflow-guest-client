import { request } from './httpClient';

describe('httpClient.request', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('returns parsed JSON on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    await expect(request('http://test/api', { method: 'GET' })).resolves.toEqual({ ok: true });
  });

  test('throws HttpClientError with user message from body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ message: 'Не найдено' }),
    });
    await expect(request('http://test/api')).rejects.toMatchObject({
      name: 'HttpClientError',
      status: 404,
      message: 'Не найдено',
    });
  });

  test('retries on failure then succeeds', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({
        ok: true,
        json: async () => ({ retried: true }),
      });
    await expect(request('http://test/api', { retries: 1, retryDelayMs: 1 })).resolves.toEqual({
      retried: true,
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
