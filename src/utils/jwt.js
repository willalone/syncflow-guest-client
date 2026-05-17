/** Разбор JWT accessToken без внешних зависимостей (только payload). */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    if (typeof atob !== 'function') return null;
    return JSON.parse(atob(b64 + pad));
  } catch {
    return null;
  }
}

export function userFromAccessToken(accessToken, loginHint) {
  const payload = decodeJwtPayload(accessToken);
  const sub = payload?.sub ?? payload?.userId ?? payload?.guestId ?? payload?.id;
  return {
    id: sub != null ? String(sub) : loginHint || 'guest',
    login: loginHint || payload?.login || String(sub || ''),
  };
}
