import { decodeJwtPayload, userFromAccessToken } from './jwt';

function makeToken(payload) {
  const body = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `hdr.${body}.sig`;
}

describe('jwt utils', () => {
  test('decodeJwtPayload returns parsed object', () => {
    const token = makeToken({ sub: 'guest-7', login: 'a@b.ru' });
    expect(decodeJwtPayload(token)).toEqual({ sub: 'guest-7', login: 'a@b.ru' });
  });

  test('decodeJwtPayload returns null for invalid token', () => {
    expect(decodeJwtPayload(null)).toBeNull();
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('a.b')).toBeNull();
  });

  test('userFromAccessToken prefers sub and login hint', () => {
    const token = makeToken({ sub: 42 });
    expect(userFromAccessToken(token, 'hint@mail.ru')).toEqual({
      id: '42',
      login: 'hint@mail.ru',
    });
  });

  test('userFromAccessToken falls back to guest id', () => {
    expect(userFromAccessToken('bad', '')).toEqual({ id: 'guest', login: '' });
    expect(userFromAccessToken('bad', 'saved@x.ru')).toEqual({ id: 'saved@x.ru', login: 'saved@x.ru' });
  });

  test('userFromAccessToken reads userId and guestId aliases', () => {
    expect(userFromAccessToken(makeToken({ userId: 9 }), null)).toEqual({ id: '9', login: '9' });
    expect(userFromAccessToken(makeToken({ guestId: 'g1' }), null)).toEqual({ id: 'g1', login: 'g1' });
  });
});
