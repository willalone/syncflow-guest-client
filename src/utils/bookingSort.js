/**
 * Сортировка броней по дате/времени.
 * Поддерживает ДД.ММ.ГГГГ, YYYY-MM-DD и поля raw с API SyncFlow.
 */

export function parseDdMmYyyyHm(dateValue, timeValue) {
  const dateStr = String(dateValue || '').trim();
  const [dd, mm, yyyy] = dateStr.split('.');
  const [hh, min] = String(timeValue || '00:00').split(':');
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const hours = Number(hh);
  const minutes = Number(min);
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    String(yyyy).length !== 4
  ) {
    return null;
  }
  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseIsoDateHm(isoDate, timeValue) {
  const iso = String(isoDate || '').trim().split('T')[0];
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return parseDdMmYyyyHm(`${d}.${m}.${y}`, timeValue);
}

export function parseBookingDateTime(booking) {
  if (!booking) return null;
  const time = String(booking.time || booking.raw?.reservHourFrom || '00:00').slice(0, 5);

  if (booking.raw?.reservDate) {
    const fromRaw = parseIsoDateHm(booking.raw.reservDate, time);
    if (fromRaw) return fromRaw;
  }

  const dateStr = String(booking.date || '').trim();
  if (!dateStr) {
    if (booking.createdAt) {
      const t = new Date(booking.createdAt);
      if (!Number.isNaN(t.getTime())) return t;
    }
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const fromIso = parseIsoDateHm(dateStr, time);
    if (fromIso) return fromIso;
  }

  const fromRu = parseDdMmYyyyHm(dateStr, time);
  if (fromRu) return fromRu;

  if (booking.createdAt) {
    const t = new Date(booking.createdAt);
    if (!Number.isNaN(t.getTime())) return t;
  }
  return null;
}

export function bookingSortTimestamp(booking) {
  const dt = parseBookingDateTime(booking);
  return dt ? dt.getTime() : 0;
}

export function sortBookingsByDate(bookings, sortMode = 'desc') {
  const list = Array.isArray(bookings) ? [...bookings] : [];
  const desc = sortMode !== 'asc';
  return list.sort((a, b) => {
    const diff = bookingSortTimestamp(b) - bookingSortTimestamp(a);
    if (diff !== 0) return desc ? diff : -diff;
    return String(a.id).localeCompare(String(b.id), 'ru');
  });
}
