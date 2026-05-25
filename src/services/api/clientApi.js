import { runtimeConfig } from '../../config/runtimeConfig';
import * as mockApi from './clientApi.mock';
import * as httpApi from './clientApi.http';
import { logger } from '../../utils/logger';

async function callWithFallback(methodName, args) {
  if (runtimeConfig.useMockApi) {
    return mockApi[methodName](...args);
  }
  if (runtimeConfig.integratedBackend === 'syncflow') {
    return httpApi[methodName](...args);
  }

  try {
    return await httpApi[methodName](...args);
  } catch (error) {
    logger.warn(`[api] ${methodName} failed, fallback to mock`, error?.message || error);
    return mockApi[methodName](...args);
  }
}

async function callStrict(methodName, args) {
  if (runtimeConfig.useMockApi) {
    return mockApi[methodName](...args);
  }
  return httpApi[methodName](...args);
}

/** Меню всегда с бэкенда (SyncFlow или локальный /api), без clientApi.mock и без fallback на статический menu.js. */
export const fetchMenu = (...args) => httpApi.fetchMenu(...args);
export const fetchMenuRecommended = (...args) => httpApi.fetchMenuRecommended(...args);
export const fetchTables = (...args) => callWithFallback('fetchTables', args);
export const fetchAllTables = (...args) => callWithFallback('fetchAllTables', args);
export const fetchBookings = (...args) => callWithFallback('fetchBookings', args);
export async function fetchOrders(...args) {
  const rows = await callWithFallback('fetchOrders', args);
  const userId = args[0];
  const { enrichOrdersWithReviewState } = await import('../../utils/orderReviews');
  return enrichOrdersWithReviewState(rows, userId);
}
export const fetchUserProfile = (...args) => callWithFallback('fetchUserProfile', args);
export const fetchFavorites = (...args) => callWithFallback('fetchFavorites', args);
export const fetchNotifications = (...args) => callWithFallback('fetchNotifications', args);
export const fetchNotificationsUnreadCount = (...args) => callWithFallback('fetchNotificationsUnreadCount', args);
export const fetchBonusTransactions = (...args) => callWithFallback('fetchBonusTransactions', args);

// Mutation methods must be strict to avoid data split between HTTP and mock storages.
export const createBooking = (...args) => callStrict('createBooking', args);
export const createOrder = (...args) => callStrict('createOrder', args);
export const updateUserProfile = (...args) => callStrict('updateUserProfile', args);
export const toggleFavorite = (...args) => callStrict('toggleFavorite', args);
export const payOrder = (...args) => callStrict('payOrder', args);
export async function submitOrderReview(...args) {
  const [orderId, payload, userId] = args;
  const { assertCanReviewOrder, markOrderAsReviewed } = await import('../../utils/orderReviews');
  await assertCanReviewOrder(userId, orderId);
  try {
    const result = await callStrict('submitOrderReview', args);
    await markOrderAsReviewed(userId, orderId, payload);
    return result;
  } catch (error) {
    const msg = String(error?.message || '');
    if (/уже|409|already|отправлен/i.test(msg)) {
      await markOrderAsReviewed(userId, orderId, payload);
      return { ok: true, alreadyReviewed: true };
    }
    throw error;
  }
}
export const registerPushDevice = (...args) => callStrict('registerPushDevice', args);
export const unregisterPushDevice = (...args) => callStrict('unregisterPushDevice', args);

export const fetchDishIngredients = (...args) => callWithFallback('fetchDishIngredients', args);
export const fetchOrderSummary = (...args) => callWithFallback('fetchOrderSummary', args);
export const fetchDishModifiers = (...args) => callWithFallback('fetchDishModifiers', args);
export const fetchReservationById = (...args) => callWithFallback('fetchReservationById', args);
export const fetchOrderDishes = (...args) => callWithFallback('fetchOrderDishes', args);
export const fetchReservationPreorder = (...args) => callWithFallback('fetchReservationPreorder', args);
export const removeReservationPreorderItem = (...args) => callStrict('removeReservationPreorderItem', args);
export const applyPromoCode = (...args) => callStrict('applyPromoCode', args);
export const applyPromoToOrder = (...args) => callStrict('applyPromoToOrder', args);
export const syncReservationPreorder = (...args) => callStrict('syncReservationPreorder', args);
export const markNotificationRead = (...args) => callStrict('markNotificationRead', args);
export const markAllNotificationsRead = (...args) => callStrict('markAllNotificationsRead', args);
export const tryApplyGuestPersonalDiscount = (...args) => callStrict('tryApplyGuestPersonalDiscount', args);
export const spendBonusPoints = (...args) => callStrict('spendBonusPoints', args);
