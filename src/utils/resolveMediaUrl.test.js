jest.mock('../config/runtimeConfig', () => ({
  runtimeConfig: {
    apiBaseUrl: 'http://192.168.0.5:3000/api',
    integratedBackend: 'local',
    useMockApi: true,
    useBackendImageProxy: true,
  },
}));

import { resolveMediaUrl } from './resolveMediaUrl';

describe('resolveMediaUrl', () => {
  test('returns empty for falsy input', () => {
    expect(resolveMediaUrl('')).toBe('');
    expect(resolveMediaUrl(null)).toBe('');
  });

  test('passes through data URLs', () => {
    const data = 'data:image/png;base64,abc';
    expect(resolveMediaUrl(data)).toBe(data);
  });

  test('resolves relative upload paths against API origin', () => {
    expect(resolveMediaUrl('/uploads/dish.jpg')).toBe('http://192.168.0.5:3000/uploads/dish.jpg');
  });

  test('rewrites localhost to configured LAN host', () => {
    expect(resolveMediaUrl('http://127.0.0.1:3000/uploads/x.png')).toBe(
      'http://192.168.0.5:3000/uploads/x.png',
    );
  });

  test('converts Google Drive share link to direct view', () => {
    const url = resolveMediaUrl('https://drive.google.com/file/d/abc123/view');
    expect(url).toContain('drive.google.com/uc?export=view&id=abc123');
  });
});
