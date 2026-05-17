/**
 * Фасад клиентского API SyncFlow: реализация разнесена по `syncflowClient/*`.
 */
export {
  fetchMenu,
  fetchMenuRecommended,
  fetchDishIngredients,
  fetchDishModifiers,
} from './syncflowClient/menu';
export {
  fetchTables,
  createBooking,
  fetchBookings,
  fetchReservationById,
  fetchReservationPreorder,
  removeReservationPreorderItem,
  addReservationPreorderItem,
  syncReservationPreorder,
} from './syncflowClient/bookings';
export {
  fetchOrderDishes,
  fetchOrders,
  createOrder,
  payOrder,
  fetchOrderSummary,
  submitOrderReview,
  spendBonusPoints,
} from './syncflowClient/orders';
export { applyPromoCode, applyPromoToOrder, tryApplyGuestPersonalDiscount } from './syncflowClient/promo';
export {
  fetchUserProfile,
  updateUserProfile,
  fetchFavorites,
  toggleFavorite,
  fetchBonusTransactions,
} from './syncflowClient/profile';
export {
  fetchNotifications,
  fetchNotificationsUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  registerPushDevice,
  unregisterPushDevice,
} from './syncflowClient/notifications';
