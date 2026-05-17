function parseTimeToMinutes(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const [h, m] = raw.split(':').map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function normalizeDateIso(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const matchIso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) return raw;
  const matchRu = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (matchRu) {
    return `${matchRu[3]}-${matchRu[2]}-${matchRu[1]}`;
  }
  return null;
}

function inRangeMinutes(target, from, to) {
  if (target == null) return true;
  if (from == null && to == null) return true;
  if (from != null && to != null) {
    if (from <= to) return target >= from && target <= to;
    return target >= from || target <= to;
  }
  if (from != null) return target >= from;
  return target <= to;
}

export function isDishAvailableForVisit(dish, context = null) {
  if (dish?.isAvailable === false) return false;
  if (!context) return true;

  const visitDate = normalizeDateIso(context?.date);
  const visitMinutes = parseTimeToMinutes(context?.time);

  const fromDate = normalizeDateIso(dish?.availabilityDateFrom);
  const toDate = normalizeDateIso(dish?.availabilityDateTo);
  if (visitDate && fromDate && visitDate < fromDate) return false;
  if (visitDate && toDate && visitDate > toDate) return false;

  const fromMinutes = parseTimeToMinutes(dish?.availabilityHourFrom);
  const toMinutes = parseTimeToMinutes(dish?.availabilityHourTo);
  return inRangeMinutes(visitMinutes, fromMinutes, toMinutes);
}
