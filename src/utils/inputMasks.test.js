import {
  applyDateMask,
  applyPhoneMask,
  applyTimeMask,
  isValidDateMask,
  isValidEmail,
  isValidEmailForSyncflow,
  isValidTimeMask,
  normalizeEmailForApi,
} from './inputMasks';

describe('inputMasks', () => {
  test('applyDateMask formats progressively', () => {
    expect(applyDateMask('1')).toBe('1');
    expect(applyDateMask('12052026')).toBe('12.05.2026');
    expect(applyDateMask('12.05.2026xx')).toBe('12.05.2026');
  });

  test('applyTimeMask formats HH:MM', () => {
    expect(applyTimeMask('18')).toBe('18');
    expect(applyTimeMask('1830')).toBe('18:30');
  });

  test('applyPhoneMask normalizes Russian numbers', () => {
    expect(applyPhoneMask('9991234567')).toMatch(/^\+7 999/);
    expect(applyPhoneMask('79991234567')).toBe('+7 999 123-45-67');
  });

  test('isValidDateMask and isValidTimeMask', () => {
    expect(isValidDateMask('31.12.2024')).toBe(true);
    expect(isValidDateMask('32.01.2024')).toBe(false);
    expect(isValidTimeMask('18:30')).toBe(true);
    expect(isValidTimeMask('25:00')).toBe(false);
  });

  test('isValidEmail', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('bad')).toBe(false);
  });

  test('normalizeEmailForApi fixes cyrillic lookalikes and case', () => {
    expect(normalizeEmailForApi('  Test@MAIL.ru  ')).toBe('test@mail.ru');
    expect(normalizeEmailForApi('tеst@mail.ru')).toBe('test@mail.ru');
  });

  test('isValidEmailForSyncflow after normalization', () => {
    expect(isValidEmailForSyncflow('user@example.com')).toBe(true);
    expect(isValidEmailForSyncflow('кириллица@mail.ru')).toBe(false);
  });
});
