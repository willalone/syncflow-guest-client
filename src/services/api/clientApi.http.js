import { runtimeConfig } from '../../config/runtimeConfig';
import * as local from './clientApi.local.http';
import * as syncflow from './clientApi.syncflow.http';

const impl = runtimeConfig.integratedBackend === 'syncflow' ? syncflow : local;

export const fetchMenu = (...args) => impl.fetchMenu(...args);
export const fetchTables = (...args) => impl.fetchTables(...args);
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
export const registerPushDevice = (...args) => impl.registerPushDevice(...args);
export const sendTestPush = (...args) => impl.sendTestPush(...args);
export const requestWaiterCall = (...args) => impl.requestWaiterCall(...args);
export const fetchDishIngredients = (...args) => impl.fetchDishIngredients(...args);
export const fetchDishModifiers = (...args) => impl.fetchDishModifiers(...args);
export const applyPromoCode = (...args) => impl.applyPromoCode(...args);
export const spendBonusPoints = (...args) => impl.spendBonusPoints(...args);
export const fetchReservationById = (...args) => impl.fetchReservationById(...args);
