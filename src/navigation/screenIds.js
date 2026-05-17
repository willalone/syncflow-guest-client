/** Идентификаторы экранов нижних табов (порядок = порядок в TabBar). */
export const TAB_ORDER = ['Menu', 'Cart', 'Booking', 'Profile'];

/** Полноэкранные оверлеи поверх табов (профиль → история и т.д.). */
export const OVERLAY_SCREEN_IDS = ['Checkout', 'Notifications', 'Orders', 'Bookings'];

export const NAVIGABLE_SCREEN_IDS = new Set([...TAB_ORDER, ...OVERLAY_SCREEN_IDS]);

export function isOverlayScreen(screen) {
  return OVERLAY_SCREEN_IDS.includes(screen);
}
