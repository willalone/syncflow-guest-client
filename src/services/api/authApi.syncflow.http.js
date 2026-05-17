import {
  RECOVERY_NETWORK_RETRIES,
  RECOVERY_TIMEOUT_MS,
} from '../../constants/passwordRecovery';
import { normalizeEmailForApi } from '../../utils/inputMasks';
import { userFromAccessToken } from '../../utils/jwt';
import { logger } from '../../utils/logger';
import { readAuthSession, writeAuthSession } from '../authSessionStorage';
import { apiBase, syncflowGuestRequest, syncflowPublicRequest } from '../syncflowHttp';

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

export async function updateAccount(_userId, patch) {
  const payload = {};
  if (patch?.firstName != null) payload.firstName = String(patch.firstName);
  if (patch?.lastName != null) payload.lastName = String(patch.lastName);
  if (patch?.email != null) payload.email = String(patch.email);
  if (patch?.phoneNumber != null) payload.phoneNumber = String(patch.phoneNumber);
  if (patch?.login != null) payload.login = String(patch.login);
  await syncflowGuestRequest('/guest/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const profile = await syncflowGuestRequest('/guest/profile');
  const session = await readAuthSession();
  const currentUser = session?.user || {};
  const nextUser = {
    ...currentUser,
    id: profile?.id != null ? String(profile.id) : currentUser.id,
    firstName: profile?.firstName ?? currentUser.firstName,
    lastName: profile?.lastName ?? currentUser.lastName,
    login: profile?.login ?? currentUser.login,
    email: profile?.email ?? currentUser.email,
    phoneNumber: profile?.phoneNumber ?? currentUser.phoneNumber,
  };
  if (session) await writeAuthSession({ ...session, user: nextUser });
  return nextUser;
}

export async function deleteAccount() {
  await syncflowGuestRequest('/guest/profile', {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
  return true;
}

/**
 * API_DOCS §2.6 шаг 1 — сервер генерирует 6-значный код и шлёт письмо по SMTP.
 * Клиент ждёт HTTP 200; только после этого показываем шаг ввода кода.
 */
export async function requestPasswordRecovery({ email, signal } = {}) {
  const normalizedEmail = normalizeEmailForApi(email);
  if (__DEV__) {
    logger.warn('[recovery] POST', `${apiBase()}/guest/auth/reset-password/request`, { email: normalizedEmail });
  }
  return syncflowPublicRequest('/guest/auth/reset-password/request', {
    method: 'POST',
    body: JSON.stringify({ email: normalizedEmail }),
    timeoutMs: RECOVERY_TIMEOUT_MS,
    networkRetries: RECOVERY_NETWORK_RETRIES,
    signal,
  });
}

/** API_DOCS §2.6 шаг 2 — подтверждение кода и смена пароля. */
export async function confirmPasswordRecovery({ email, code, newPassword, signal } = {}) {
  const normalizedEmail = normalizeEmailForApi(email);
  return syncflowPublicRequest('/guest/auth/reset-password/confirm', {
    method: 'POST',
    body: JSON.stringify({
      email: normalizedEmail,
      code: String(code || '').trim(),
      newPassword: String(newPassword || ''),
    }),
    timeoutMs: RECOVERY_TIMEOUT_MS,
    networkRetries: RECOVERY_NETWORK_RETRIES,
    signal,
  });
}
