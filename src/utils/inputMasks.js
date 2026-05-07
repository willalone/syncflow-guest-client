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

export function applyPhoneMask(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  const normalized = digits.startsWith('7') ? digits : `7${digits.slice(0, 10)}`;
  const p = normalized.slice(1);
  const a = p.slice(0, 3);
  const b = p.slice(3, 6);
  const c = p.slice(6, 8);
  const d = p.slice(8, 10);
  let result = '+7';
  if (a) result += ` ${a}`;
  if (b) result += ` ${b}`;
  if (c) result += `-${c}`;
  if (d) result += `-${d}`;
  return result;
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
