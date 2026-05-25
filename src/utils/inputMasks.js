export function applyDateMask(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  if (digits.length <= 2) return dd;
  if (digits.length <= 4) return `${dd}.${mm}`;
  return `${dd}.${mm}.${yyyy}`;
}

export function applyTimeMask(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  if (digits.length <= 2) return hh;
  return `${hh}:${mm}`;
}

/** Шаблон: +7(___)___-__-__ */
export const PHONE_MASK_PREFIX = '+7(';
export const PHONE_MASK_MAX_LENGTH = 18;

function extractRuPhoneDigits(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits.length) return '7';
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith('7')) digits = `7${digits}`;
  return digits.slice(0, 11);
}

export function applyPhoneMask(value) {
  const raw = String(value ?? '');
  const digits = extractRuPhoneDigits(raw);
  const local = digits.slice(1);
  if (!local.length) return PHONE_MASK_PREFIX;

  const a = local.slice(0, 3);
  const b = local.slice(3, 6);
  const c = local.slice(6, 8);
  const d = local.slice(8, 10);

  let result = `${PHONE_MASK_PREFIX}${a}`;
  if (a.length === 3) result += ')';
  if (b) result += b;
  if (b.length === 3 && c) result += `-${c}`;
  if (c.length === 2 && d) result += `-${d}`;
  return result;
}

export function isValidPhoneMask(value) {
  return extractRuPhoneDigits(value).length === 11;
}

export function isValidDateMask(value) {
  const [dRaw, mRaw, yRaw] = String(value || '').split('.');
  const d = Number(dRaw);
  const m = Number(mRaw);
  const y = Number(yRaw);
  if (!d || !m || !y || String(yRaw || '').length !== 4) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function isValidTimeMask(value) {
  const [hRaw, mRaw] = String(value || '').split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 && String(hRaw || '').length === 2 && String(mRaw || '').length === 2;
}

export function isValidEmail(value) {
  const v = String(value || '').trim();
  if (!v || !v.includes('@')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Кириллические буквы, похожие на латиницу (частая причина отказа @Email на сервере). */
const CYRILLIC_LATIN_LOOKALIKES = new Map([
  ['\u0430', 'a'],
  ['\u0410', 'a'],
  ['\u0435', 'e'],
  ['\u0415', 'e'],
  ['\u043E', 'o'],
  ['\u041E', 'o'],
  ['\u0440', 'p'],
  ['\u0420', 'p'],
  ['\u0441', 'c'],
  ['\u0421', 'c'],
  ['\u0443', 'y'],
  ['\u0423', 'y'],
  ['\u0445', 'x'],
  ['\u0425', 'x'],
  ['\u043C', 'm'],
  ['\u041C', 'm'],
  ['\u0442', 't'],
  ['\u0422', 't'],
  ['\u043D', 'n'],
  ['\u041D', 'n'],
  ['\u043A', 'k'],
  ['\u041A', 'k'],
  ['\u0456', 'i'],
  ['\u0406', 'i'],
]);

/**
 * Email для API: убирает невидимые символы, полноширинный @, подменяет похожую кириллицу, lower-case.
 * Подходит для Spring @Email на бэкенде.
 */
export function normalizeEmailForApi(raw) {
  let s = String(raw || '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .trim()
    .normalize('NFKC');
  s = s.replace(/\uFF20/g, '@');
  s = [...s].map((ch) => CYRILLIC_LATIN_LOOKALIKES.get(ch) ?? ch).join('');
  return s.toLowerCase();
}

/** Строгая проверка после нормализации (латиница/цифры, как ожидает типичный бэкенд). */
export function isValidEmailForSyncflow(value) {
  const v = normalizeEmailForApi(value);
  if (!v || !v.includes('@')) return false;
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(v);
}
