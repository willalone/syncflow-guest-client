import { runtimeConfig } from '../../config/runtimeConfig';
import * as local from './clientApi.local.http';
import * as syncflow from './clientApi.syncflow.http';

const impl = runtimeConfig.integratedBackend === 'syncflow' ? syncflow : local;

export const fetchMenu = (...args) => impl.fetchMenu(...args);
export const fetchMenuRecommended = (...args) =>
  typeof impl.fetchMenuRecommended === 'function' ? impl.fetchMenuRecommended(...args) : impl.fetchMenu().then((m) => m.dishes.slice(0, 5));
export const fetchTables = (...args) => impl.fetchTables(...args);
export const fetchAllTables = (...args) =>
  typeof impl.fetchAllTables === 'function' ? impl.fetchAllTables(...args) : impl.fetchTables(...args);
export const createBooking = (...args) => impl.createBooking(...args);
export const fetchBookings = (...args) => impl.fetchBookings(...args);
export const fetchOrders = (...args) => impl.fetchOrders(...args);
export const createOrder = (...args) => impl.createOrder(...args);
export const payOrder = (...args) => impl.payOrder(...args);
export const submitOrderReview = (...args) => impl.submitOrderReview(...args);
export const fetchUserProfile = (...args) => impl.fetchUserProfile(...args);
export const updateUserProfile = (...args) => impl.updateUserProfile(...args);
export const fetchFavorites = (...args) => impl.fetchFavorites(...args);
export const toggleFavorite = (...args) => impl.toggleFavorite(...args);
export const fetchNotifications = (...args) => impl.fetchNotifications(...args);
export const fetchNotificationsUnreadCount = (...args) =>
  typeof impl.fetchNotificationsUnreadCount === 'function'
    ? impl.fetchNotificationsUnreadCount(...args)
    : Promise.resolve(0);
export const markNotificationRead = (...args) =>
  typeof impl.markNotificationRead === 'function'
    ? impl.markNotificationRead(...args)
    : Promise.resolve(null);
export const markAllNotificationsRead = (...args) =>
  typeof impl.markAllNotificationsRead === 'function'
    ? impl.markAllNotificationsRead(...args)
    : Promise.resolve(null);
export const fetchBonusTransactions = (...args) =>
  typeof impl.fetchBonusTransactions === 'function' ? impl.fetchBonusTransactions(...args) : Promise.resolve([]);
export const tryApplyGuestPersonalDiscount = (...args) =>
  typeof impl.tryApplyGuestPersonalDiscount === 'function'
    ? impl.tryApplyGuestPersonalDiscount(...args)
    : Promise.resolve(null);
export const registerPushDevice = (...args) => impl.registerPushDevice(...args);
export const unregisterPushDevice = (...args) => impl.unregisterPushDevice(...args);
export const fetchDishIngredients = (...args) => impl.fetchDishIngredients(...args);
export const fetchDishModifiers = (...args) => impl.fetchDishModifiers(...args);
export const applyPromoCode = (...args) => impl.applyPromoCode(...args);
export const spendBonusPoints = (...args) => impl.spendBonusPoints(...args);
export const fetchReservationById = (...args) => impl.fetchReservationById(...args);
export const fetchOrderDishes = (...args) =>
  typeof impl.fetchOrderDishes === 'function' ? impl.fetchOrderDishes(...args) : Promise.resolve([]);
export const fetchReservationPreorder = (...args) =>
  typeof impl.fetchReservationPreorder === 'function' ? impl.fetchReservationPreorder(...args) : Promise.resolve([]);
export const removeReservationPreorderItem = (...args) =>
  typeof impl.removeReservationPreorderItem === 'function'
    ? impl.removeReservationPreorderItem(...args)
    : Promise.reject(new Error('Удаление позиции предзаказа недоступно.'));
export const applyPromoToOrder = (...args) =>
  typeof impl.applyPromoToOrder === 'function'
    ? impl.applyPromoToOrder(...args)
    : Promise.reject(new Error('Применение промокода к заказу недоступно.'));
export const syncReservationPreorder = (...args) =>
  typeof impl.syncReservationPreorder === 'function'
    ? impl.syncReservationPreorder(...args)
    : Promise.reject(new Error('Предзаказ к брони недоступен.'));
export const fetchOrderSummary = (...args) =>
  typeof impl.fetchOrderSummary === 'function' ? impl.fetchOrderSummary(...args) : Promise.resolve(null);
