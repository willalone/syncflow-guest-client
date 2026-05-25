import { request } from '../httpClient';
import { runtimeConfig } from '../../config/runtimeConfig';

const BASE = runtimeConfig.apiBaseUrl.replace(/\/+$/, '');

export function fetchMenu() {
  return request(`${BASE}/menu`);
}

export function fetchMenuRecommended(limit) {
  return fetchMenu().then((data) => {
    const dishes = Array.isArray(data?.dishes) ? data.dishes : Array.isArray(data) ? data : [];
    const n = Math.max(1, Math.min(50, Number(limit) || 5));
    return dishes.slice(0, n);
  });
}

export function fetchTables() {
  return request(`${BASE}/tables`);
}

export function fetchAllTables() {
  return fetchTables();
}

export function createBooking(payload, userId) {
  return request(`${BASE}/bookings`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, userId }),
  });
}

export function fetchBookings(userId) {
  return request(`${BASE}/bookings?userId=${encodeURIComponent(userId || '')}`);
}

export function fetchOrders(userId, options = {}) {
  const limit = Number(options?.limit ?? 30);
  const offset = Number(options?.offset ?? 0);
  return request(
    `${BASE}/orders?userId=${encodeURIComponent(userId || '')}&limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`
  );
}

export function createOrder(payload, userId) {
  return request(`${BASE}/orders`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, userId }),
  });
}

export function payOrder(orderId, userId) {
  return request(`${BASE}/orders/${encodeURIComponent(orderId || '')}/pay`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function submitOrderReview(orderId, payload, userId) {
  return request(`${BASE}/orders/${encodeURIComponent(orderId || '')}/review`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, userId }),
  });
}

export function fetchUserProfile(userId) {
  return request(`${BASE}/profiles/${encodeURIComponent(userId || '')}`);
}

export function updateUserProfile(userId, patch) {
  return request(`${BASE}/profiles/${encodeURIComponent(userId || '')}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function fetchFavorites(userId) {
  return request(`${BASE}/favorites?userId=${encodeURIComponent(userId || '')}`);
}

export function toggleFavorite(userId, dishId) {
  return request(`${BASE}/favorites/toggle`, {
    method: 'POST',
    body: JSON.stringify({ userId, dishId }),
  });
}

export function fetchNotifications(userId, options = {}) {
  const limit = Number(options?.limit ?? 50);
  const offset = Number(options?.offset ?? 0);
  return request(
    `${BASE}/notifications?userId=${encodeURIComponent(userId || '')}&limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`
  );
}

export function registerPushDevice(userId, payload) {
  return request(`${BASE}/push/register`, {
    method: 'POST',
    body: JSON.stringify({ userId, ...payload }),
  });
}

export function unregisterPushDevice(_token) {
  return Promise.resolve(null);
}

export function sendTestPush(userId, payload = {}) {
  return request(`${BASE}/push/test`, {
    method: 'POST',
    body: JSON.stringify({ userId, ...payload }),
  });
}

export function requestWaiterCall(payload, userId) {
  return request(`${BASE}/service/waiter`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, userId }),
  });
}

export function fetchDishIngredients() {
  return Promise.resolve([]);
}

export function fetchDishModifiers() {
  return Promise.resolve([]);
}

export function applyPromoCode() {
  return Promise.reject(new Error('Промокоды сейчас недоступны в демо-режиме без подключения к сети ресторана.'));
}

export function spendBonusPoints() {
  return Promise.resolve(null);
}

export function fetchReservationById() {
  return Promise.resolve(null);
}

export function fetchOrderDishes() {
  return Promise.resolve([]);
}

export function fetchReservationPreorder() {
  return Promise.resolve([]);
}

export function removeReservationPreorderItem() {
  return Promise.reject(new Error('Предзаказ к брони не поддерживается локальным API.'));
}

export function applyPromoToOrder() {
  return Promise.reject(new Error('Промокод к заказу не поддерживается локальным API.'));
}

export function syncReservationPreorder() {
  return Promise.reject(new Error('Предзаказ к брони не поддерживается локальным API.'));
}

export function fetchNotificationsUnreadCount(_userId) {
  return Promise.resolve(0);
}

export function markNotificationRead(_userId, _notificationId) {
  return Promise.resolve(null);
}

export function markAllNotificationsRead(_userId) {
  return Promise.resolve(null);
}

export function fetchBonusTransactions(_userId) {
  return Promise.resolve([]);
}

export function tryApplyGuestPersonalDiscount() {
  return Promise.resolve(null);
}

export function fetchOrderSummary() {
  return Promise.resolve(null);
}
