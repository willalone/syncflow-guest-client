import { runtimeConfig } from '../config/runtimeConfig';
import { readAuthSession, writeAuthSession } from './authSessionStorage';

const DEFAULT_TIMEOUT = 12000;

function toUserMessage(status, rawBody) {
  let parsed = null;
  let message = null;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
    const raw = parsed?.error?.message || parsed?.message;
    if (raw) message = String(raw);
  } catch {
    // no-op
  }
  if (
    status >= 500 &&
    message &&
    /непредвиденн|internal server error|unexpected error/i.test(message)
  ) {
    return 'Сервер временно недоступен. Попробуйте чуть позже.';
  }
  if (message) return message;
  if (status === 400) return 'Проверьте корректность введенных данных.';
  if (status === 401) return 'Требуется повторный вход в аккаунт.';
  if (status === 403) return 'Недостаточно прав для выполнения операции.';
  if (status === 404) return 'Запрошенные данные не найдены.';
  if (status === 409) return 'Не удалось выполнить: проверьте время, стол или условия акции.';
  if (status >= 500) return 'Сервер временно недоступен. Попробуйте чуть позже.';
  return 'Не удалось выполнить операцию. Попробуйте еще раз.';
}

function apiBase() {
  return runtimeConfig.apiBaseUrl.replace(/\/+$/, '');
}

let refreshPromise = null;

async function refreshGuestAccess() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const session = await readAuthSession();
    if (!session?.refreshToken) {
      throw new Error('Сессия истекла. Войдите снова.');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
    try {
      const response = await fetch(`${apiBase()}/guest/auth/refresh`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      const body = await response.text();
      if (!response.ok) {
        throw new Error(toUserMessage(response.status, body));
      }
      const data = JSON.parse(body);
      const nextRefresh = data.refreshToken != null ? data.refreshToken : session.refreshToken;
      const next = {
        ...session,
        accessToken: data.accessToken,
        refreshToken: nextRefresh,
        token: data.accessToken,
      };
      await writeAuthSession(next);
      return next;
    } finally {
      clearTimeout(timeout);
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/**
 * Запрос без Authorization (например GET /api/menu/client).
 */
export async function syncflowPublicRequest(path, options = {}) {
  const url = `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const body = await response.text();
    if (!response.ok) {
      const err = new Error(toUserMessage(response.status, body));
      err.name = 'HttpClientError';
      err.status = response.status;
      err.rawBody = body;
      throw err;
    }
    if (body === '' || response.status === 204) return null;
    const ct = response.headers.get('content-type') || '';
    if (!/json/i.test(ct)) return body;
    return JSON.parse(body);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Запрос от имени гостя с Bearer; при 401 — POST /api/guest/auth/refresh и одна повторная попытка.
 */
export async function syncflowGuestRequest(path, options = {}) {
  const url = `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const run = async (accessToken) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });
      const text = await response.text();
      return { response, text };
    } finally {
      clearTimeout(timeout);
    }
  };

  const session = await readAuthSession();
  let token = session?.accessToken || session?.token;
  let { response, text } = await run(token);

  if (response.status === 401 && session?.refreshToken) {
    const next = await refreshGuestAccess();
    ({ response, text } = await run(next.accessToken));
  }

  if (!response.ok) {
    const err = new Error(toUserMessage(response.status, text));
    err.name = 'HttpClientError';
    err.status = response.status;
    err.rawBody = text;
    throw err;
  }
  if (text === '' || response.status === 204) return null;
  const ct = response.headers.get('content-type') || '';
  if (!/json/i.test(ct)) return text;
  return JSON.parse(text);
}
