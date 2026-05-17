import { isDishAvailableForVisit } from './menuAvailability';

const baseDish = { isAvailable: true };

describe('isDishAvailableForVisit', () => {
  test('returns false when dish unavailable', () => {
    expect(isDishAvailableForVisit({ isAvailable: false }, null)).toBe(false);
  });

  test('returns true without context', () => {
    expect(isDishAvailableForVisit(baseDish, null)).toBe(true);
  });

  test('checks date range', () => {
    const dish = {
      ...baseDish,
      availabilityDateFrom: '2026-06-01',
      availabilityDateTo: '2026-06-30',
    };
    expect(isDishAvailableForVisit(dish, { date: '15.05.2026', time: '12:00' })).toBe(false);
    expect(isDishAvailableForVisit(dish, { date: '15.06.2026', time: '12:00' })).toBe(true);
  });

  test('checks time window', () => {
    const dish = {
      ...baseDish,
      availabilityHourFrom: '10:00',
      availabilityHourTo: '14:00',
    };
    expect(isDishAvailableForVisit(dish, { date: '15.06.2026', time: '09:00' })).toBe(false);
    expect(isDishAvailableForVisit(dish, { date: '15.06.2026', time: '12:00' })).toBe(true);
  });
});
