import {
  addTwoHoursHms,
  apiDateToDdMmYyyy,
  birthDdMmYyyyToApiIso,
  dateDdMmYyyyToIso,
  padTimeToHms,
  pickFirstFinite,
} from './shared';

describe('syncflowClient/shared', () => {
  test('pickFirstFinite', () => {
    expect(pickFirstFinite([undefined, NaN, '5', 3])).toBe(5);
    expect(pickFirstFinite([NaN, undefined], 9)).toBe(9);
  });

  test('apiDateToDdMmYyyy', () => {
    expect(apiDateToDdMmYyyy('2026-05-15')).toBe('15.05.2026');
    expect(apiDateToDdMmYyyy('bad')).toBe('');
  });

  test('birthDdMmYyyyToApiIso and dateDdMmYyyyToIso', () => {
    expect(birthDdMmYyyyToApiIso('5.3.1990')).toBe('1990-03-05');
    expect(birthDdMmYyyyToApiIso('x')).toBeNull();
    expect(dateDdMmYyyyToIso('15.05.2026')).toBe('2026-05-15');
  });

  test('padTimeToHms and addTwoHoursHms', () => {
    expect(padTimeToHms('9:5')).toBe('09:05:00');
    expect(addTwoHoursHms('10:00:00')).toBe('12:00:00');
    expect(addTwoHoursHms('23:30:00')).toBe('01:30:00');
  });
});
