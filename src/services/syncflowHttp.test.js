import { apiBase, toUserMessage } from './syncflowHttp';

describe('syncflowHttp helpers', () => {
  test('apiBase strips trailing slashes', () => {
    expect(apiBase()).toBe('http://127.0.0.1:3000/api');
  });

  test('toUserMessage prefers JSON message', () => {
    expect(toUserMessage(400, JSON.stringify({ message: 'Неверный стол' }))).toBe('Неверный стол');
  });

  test('toUserMessage appends HTTP code for 5xx', () => {
    const msg = toUserMessage(500, JSON.stringify({ message: 'Internal' }));
    expect(msg).toContain('Internal');
    expect(msg).toContain('500');
  });

  test('toUserMessage falls back by status', () => {
    expect(toUserMessage(401, '')).toMatch(/вход/i);
    expect(toUserMessage(409, '')).toMatch(/время|стол/i);
  });
});
