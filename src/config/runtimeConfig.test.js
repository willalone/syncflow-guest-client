import { runtimeConfig } from './runtimeConfig';

describe('runtimeConfig', () => {
  test('reads expo extra from jest.setup mock', () => {
    expect(runtimeConfig.integratedBackend).toBe('syncflow');
    expect(runtimeConfig.apiBaseUrl).toBe('http://127.0.0.1:3000/api');
    expect(runtimeConfig.useMockApi).toBe(false);
  });

  test('disables image proxy for syncflow backend', () => {
    expect(runtimeConfig.useBackendImageProxy).toBe(false);
  });
});
