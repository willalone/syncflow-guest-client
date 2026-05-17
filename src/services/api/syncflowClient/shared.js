export function pickFirstFinite(values, fallback = 0) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function apiDateToDdMmYyyy(iso) {
  const s = String(iso || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export function birthDdMmYyyyToApiIso(raw) {
  const parts = String(raw || '').trim().split('.');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!/^\d{1,2}$/.test(dd) || !/^\d{1,2}$/.test(mm) || !/^\d{4}$/.test(yyyy)) return null;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

export function padTimeToHms(t) {
  const [h = '0', m = '0'] = String(t || '00:00').split(':');
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

export function dateDdMmYyyyToIso(dateStr) {
  const parts = String(dateStr || '').split('.');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!yyyy || !mm || !dd) return null;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

export function addTwoHoursHms(hms) {
  const [H, M] = String(hms || '00:00:00')
    .split(':')
    .map((x) => Number(x));
  const startMin = (Number.isFinite(H) ? H : 0) * 60 + (Number.isFinite(M) ? M : 0);
  const endMin = startMin + 120;
  const eh = Math.floor(endMin / 60) % 24;
  const em = endMin % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`;
}
