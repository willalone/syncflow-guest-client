import { runtimeConfig } from '../config/runtimeConfig';
import { logger } from '../utils/logger';
import { readAuthSession, writeAuthSession } from './authSessionStorage';

const DEFAULT_TIMEOUT = 12000;
const DEFAULT_NETWORK_RETRIES = 1;
const connectionListeners = new Set();
let transportDown = false;

function notifyConnection(state) {
  connectionListeners.forEach((listener) => {
    try {
      listener(state);
    } catch {
      // no-op
    }
  });
}

function markTransportFailure() {
  if (transportDown) return;
  transportDown = true;
  notifyConnection('down');
}

function markTransportRecovered() {
  if (!transportDown) return;
  transportDown = false;
  notifyConnection('restored');
}

export function subscribeNetworkConnection(listener) {
  if (typeof listener !== 'function') return () => {};
  connectionListeners.add(listener);
  return () => {
    connectionListeners.delete(listener);
  };
}

function pickJsonErrorMessage(parsed) {
  if (parsed == null || typeof parsed !== 'object') return null;
  const err = parsed.error;
  const fromErrorsArray = () => {
    const list = parsed.errors;
    if (!Array.isArray(list) || !list.length) return null;
    const row = list[0];
    if (typeof row === 'string' && row.trim()) return row.trim();
    if (row && typeof row === 'object') {
      const m = row.defaultMessage ?? row.message ?? row.field;
      if (m != null && String(m).trim()) return String(m).trim();
    }
    return null;
  };
  const fromViolations = () => {
    const v = parsed.violations;
    if (!Array.isArray(v) || !v.length) return null;
    const m = v[0]?.message ?? v[0]?.interpolatedMessage;
    return m != null && String(m).trim() ? String(m).trim() : null;
  };
  const candidates = [
    typeof parsed.message === 'string' ? parsed.message : null,
    typeof parsed.reason === 'string' ? parsed.reason : null,
    err && typeof err === 'object' ? err.message : null,
    typeof err === 'string' ? err : null,
    typeof parsed.detail === 'string' ? parsed.detail : null,
    typeof parsed.description === 'string' ? parsed.description : null,
    parsed.title && parsed.detail ? `${parsed.title}: ${parsed.detail}` : typeof parsed.title === 'string' ? parsed.title : null,
    fromErrorsArray(),
    fromViolations(),
  ];
  for (const c of candidates) {
    const s = c != null ? String(c).trim() : '';
    if (s) return s;
  }
  return null;
}

export function toUserMessage(status, rawBody) {
  let parsed = null;
  let message = null;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
    message = pickJsonErrorMessage(parsed);
  } catch {
    const trimmed = String(rawBody || '').trim();
    if (trimmed && trimmed.length < 500 && !/^\s*</.test(trimmed)) {
      message = trimmed;
    }
  }
  if (!message && parsed && typeof parsed === 'object') {
    const p = parsed.path;
    if (typeof p === 'string' && p.trim()) {
      message = `Сбой на сервере (запрос ${p.trim()})`;
    }
  }
  if (message) {
    if (status >= 500 && message.length < 800) {
      return `${message} (HTTP ${status})`;
    }
    return message;
  }
  if (status === 400) return 'Проверьте корректность введенных данных.';
  if (status === 401) return 'Требуется повторный вход в аккаунт.';
  if (status === 403) return 'Недостаточно прав для выполнения операции.';
  if (status === 404) return 'Запрошенные данные не найдены.';
  if (status === 409) return 'Не удалось выполнить: проверьте время, стол или условия акции.';
  if (status >= 500) {
    return `Сервер вернул ошибку (HTTP ${status}). Попробуйте позже; если повторяется — это неполадка на стороне ресторана.`;
  }
  return 'Не удалось выполнить операцию. Попробуйте еще раз.';
}

export function apiBase() {
  return runtimeConfig.apiBaseUrl.replace(/\/+$/, '');
}

function restaurantHeaders() {
  const id = runtimeConfig.restaurantId;
  if (!id) return {};
  return { 'X-Restaurant-ID': id };
}

function normalizeTransportError(error) {
  const msg = String(error?.message || error || '');
  const isAbort = error?.name === 'AbortError' || /aborted/i.test(msg);
  if (isAbort) {
    const e = new Error(
      'Нет ответа в отведённое время: возможны проблемы сети или сервер ещё не закончил запрос (например отправка письма). Повторите попытку.',
    );
    e.name = 'NetworkTimeoutError';
    e.cause = error;
    return e;
  }
  if (/network request failed|failed to fetch|load failed|socket|ssl|empty reply|connection|timed out/i.test(msg)) {
    const e = new Error('Проблема с сетью или сервером. Проверьте интернет и повторите попытку.');
    e.name = 'NetworkTransportError';
    e.cause = error;
    return e;
  }
  return error;
}

let refreshPromise = null;

/** Обновляет access/refresh в AsyncStorage; AuthContext подписан на writeAuthSession. */
export async function refreshGuestAccess() {
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
        headers: {
          'Content-Type': 'application/json',
          ...restaurantHeaders(),
        },
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
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const retries = Number(options.networkRetries ?? DEFAULT_NETWORK_RETRIES);
  const externalSignal = options.signal;
  const fetchInit = { ...options };
  delete fetchInit.timeoutMs;
  delete fetchInit.networkRetries;
  delete fetchInit.signal;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let onExternalAbort;
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeout);
        const aborted =
          typeof DOMException !== 'undefined'
            ? new DOMException('Aborted', 'AbortError')
            : Object.assign(new Error('Aborted'), { name: 'AbortError' });
        throw normalizeTransportError(aborted);
      }
      onExternalAbort = () => controller.abort();
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
    try {
      const response = await fetch(url, {
        ...fetchInit,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...restaurantHeaders(),
          ...(fetchInit.headers || {}),
        },
      });
      markTransportRecovered();
      const body = await response.text();
      if (!response.ok) {
        if (__DEV__) {
          logger.warn('[syncflowHttp]', path, response.status, String(body || '').slice(0, 800));
        }
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
    } catch (error) {
      const normalized = normalizeTransportError(error);
      if (normalized?.name === 'NetworkTimeoutError' || normalized?.name === 'NetworkTransportError') {
        markTransportFailure();
      }
      const canRetry = !(normalized?.status >= 400 && normalized?.status < 500);
      if (attempt < retries && canRetry) {
        continue;
      }
      throw normalized;
    } finally {
      clearTimeout(timeout);
      if (externalSignal && onExternalAbort) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }
}

/**
 * Запрос от имени гостя с Bearer; при 401 — POST /api/guest/auth/refresh и одна повторная попытка.
 */
export async function syncflowGuestRequest(path, options = {}) {
  const url = `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const retries = Number(options.networkRetries ?? DEFAULT_NETWORK_RETRIES);
  const fetchInit = { ...options };
  delete fetchInit.timeoutMs;
  delete fetchInit.networkRetries;

  const run = async (accessToken) => {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const headers = {
          'Content-Type': 'application/json',
          ...restaurantHeaders(),
          ...(fetchInit.headers || {}),
        };
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }
        const response = await fetch(url, {
          ...fetchInit,
          signal: controller.signal,
          headers,
        });
        markTransportRecovered();
        const text = await response.text();
        return { response, text };
      } catch (error) {
        const normalized = normalizeTransportError(error);
        if (normalized?.name === 'NetworkTimeoutError' || normalized?.name === 'NetworkTransportError') {
          markTransportFailure();
        }
        if (attempt < retries) {
          continue;
        }
        throw normalized;
      } finally {
        clearTimeout(timeout);
      }
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
    if (__DEV__) {
      logger.warn('[syncflowHttp]', path, response.status, String(text || '').slice(0, 800));
    }
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
