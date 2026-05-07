import { syncflowPublicRequest } from '../syncflowHttp';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Сразу после регистрации login иногда отвечает «Клиент не найден» (задержка записи в БД).
 */
async function guestLoginAfterRegister(login, password) {
  const attempts = 4;
  const delayMs = 400;
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await syncflowPublicRequest('/guest/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
      });
    } catch (e) {
      lastError = e;
      const msg = e?.message || '';
      const maybeRace = /клиент не найден/i.test(msg);
      if (maybeRace && i < attempts - 1) {
        await sleep(delayMs);
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

function decodeJwtPayload(token) {
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

function userFromAccessToken(accessToken, loginHint) {
  const payload = decodeJwtPayload(accessToken);
  const sub = payload?.sub ?? payload?.userId ?? payload?.guestId ?? payload?.id;
  return {
    id: sub != null ? String(sub) : loginHint || 'guest',
    login: loginHint || payload?.login || String(sub || ''),
  };
}

/**
 * POST /api/guest/auth/login — тело: { "login", "password" } (API_DOCS.md §2.3).
 */
export async function signIn({ login, password }) {
  const data = await syncflowPublicRequest('/guest/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });
  const user = userFromAccessToken(data.accessToken, login);
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    token: data.accessToken,
    user: { ...user, login },
  };
}

/**
 * POST /api/guest/auth/register — тело по §2.2; ответ GuestDTO, затем при необходимости login.
 */
export async function signUp({
  firstName,
  lastName,
  patronymic,
  login,
  password,
  phoneNumber,
  email,
  dateOfBirth,
}) {
  const body = {
    firstName,
    lastName,
    login,
    password,
  };
  if (patronymic) body.patronymic = patronymic;
  if (phoneNumber) body.phoneNumber = phoneNumber;
  if (email) body.email = email;
  if (dateOfBirth) body.dateOfBirth = dateOfBirth;

  const guest = await syncflowPublicRequest('/guest/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  let accessToken = guest?.accessToken;
  let refreshToken = guest?.refreshToken;

  if (!accessToken || !refreshToken) {
    const tokens = await guestLoginAfterRegister(login, password);
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  }

  const user = {
    id: guest?.id != null ? String(guest.id) : userFromAccessToken(accessToken, login).id,
    firstName: guest?.firstName ?? firstName,
    lastName: guest?.lastName ?? lastName,
    patronymic: guest?.patronymic,
    login: guest?.login ?? login,
    phoneNumber: guest?.phoneNumber ?? phoneNumber,
    email: guest?.email ?? email,
    dateOfBirth: guest?.dateOfBirth ?? dateOfBirth,
  };

  return {
    accessToken,
    refreshToken,
    token: accessToken,
    user,
  };
}

export function updateAccount() {
  return Promise.resolve(null);
}

export async function deleteAccount() {
  throw new Error('Удаление аккаунта в приложении недоступно. Обратитесь в ресторан.');
}

export async function requestPasswordRecovery({ email, code }) {
  return syncflowPublicRequest('/guest/auth/recovery/request', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export async function confirmPasswordRecovery({ email, code, newPassword }) {
  return syncflowPublicRequest('/guest/auth/recovery/confirm', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword }),
  });
}
