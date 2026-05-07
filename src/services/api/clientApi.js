import { runtimeConfig } from '../../config/runtimeConfig';
import * as mockApi from './clientApi.mock';
import * as httpApi from './clientApi.http';
const api = runtimeConfig.useMockApi ? mockApi : httpApi;

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
    console.warn(`[api] ${methodName} failed, fallback to mock`, error?.message || error);
    return mockApi[methodName](...args);
  }
}

async function callStrict(methodName, args) {
  if (runtimeConfig.useMockApi) {
    return mockApi[methodName](...args);
  }
  return httpApi[methodName](...args);
}

export const fetchMenu = (...args) => callWithFallback('fetchMenu', args);
export const fetchTables = (...args) => callWithFallback('fetchTables', args);
export const fetchBookings = (...args) => callWithFallback('fetchBookings', args);
export const fetchOrders = (...args) => callWithFallback('fetchOrders', args);
export const fetchUserProfile = (...args) => callWithFallback('fetchUserProfile', args);
export const fetchFavorites = (...args) => callWithFallback('fetchFavorites', args);
export const fetchNotifications = (...args) => callWithFallback('fetchNotifications', args);

// Mutation methods must be strict to avoid data split between HTTP and mock storages.
export const createBooking = (...args) => callStrict('createBooking', args);
export const createOrder = (...args) => callStrict('createOrder', args);
export const updateUserProfile = (...args) => callStrict('updateUserProfile', args);
export const toggleFavorite = (...args) => callStrict('toggleFavorite', args);
export const payOrder = (...args) => callStrict('payOrder', args);
export const submitOrderReview = (...args) => callStrict('submitOrderReview', args);
export const registerPushDevice = (...args) => callStrict('registerPushDevice', args);
export const sendTestPush = (...args) => callStrict('sendTestPush', args);
export const requestWaiterCall = (...args) => callStrict('requestWaiterCall', args);

export const fetchDishIngredients = (...args) => callWithFallback('fetchDishIngredients', args);
export const fetchDishModifiers = (...args) => callWithFallback('fetchDishModifiers', args);
export const fetchReservationById = (...args) => callWithFallback('fetchReservationById', args);
export const applyPromoCode = (...args) => callStrict('applyPromoCode', args);
export const spendBonusPoints = (...args) => callStrict('spendBonusPoints', args);
