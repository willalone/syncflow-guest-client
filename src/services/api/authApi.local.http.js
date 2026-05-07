import { request } from '../httpClient';
import { runtimeConfig } from '../../config/runtimeConfig';

const BASE = runtimeConfig.apiBaseUrl.replace(/\/+$/, '');

export function signIn(payload) {
  return request(`${BASE}/auth/sign-in`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function signUp(payload) {
  return request(`${BASE}/auth/sign-up`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAccount() {
  return null;
}

export function deleteAccount(_userId, token) {
  if (!token) {
    throw new Error('Unauthorized');
  }
  return request(`${BASE}/auth/account`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function requestPasswordRecovery() {
  throw new Error('Восстановление пароля доступно только на интегрированном сервере.');
}

export function confirmPasswordRecovery() {
  throw new Error('Восстановление пароля доступно только на интегрированном сервере.');
}
