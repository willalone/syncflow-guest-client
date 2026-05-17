import {
  isOverlayScreen,
  NAVIGABLE_SCREEN_IDS,
  OVERLAY_SCREEN_IDS,
  TAB_ORDER,
} from './screenIds';

describe('screenIds', () => {
  test('TAB_ORDER has four main tabs', () => {
    expect(TAB_ORDER).toEqual(['Menu', 'Cart', 'Booking', 'Profile']);
  });

  test('NAVIGABLE_SCREEN_IDS includes tabs and overlays', () => {
    expect(NAVIGABLE_SCREEN_IDS.has('Menu')).toBe(true);
    expect(NAVIGABLE_SCREEN_IDS.has('Orders')).toBe(true);
    expect(NAVIGABLE_SCREEN_IDS.has('Unknown')).toBe(false);
  });

  test('isOverlayScreen', () => {
    expect(isOverlayScreen('Orders')).toBe(true);
    expect(isOverlayScreen('Menu')).toBe(false);
    expect(OVERLAY_SCREEN_IDS).toContain('Notifications');
  });
});
