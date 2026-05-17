/**
 * Одинаковая нормализация «список или Spring-обёртка» для SyncFlow API.
 * Используется в мапперах и в UI-хелперах бронирований.
 */
export function unwrapSyncflowList(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'object') return [];
  if (Array.isArray(raw.content)) return raw.content;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.results)) return raw.results;
  if (raw._embedded && typeof raw._embedded === 'object') {
    for (const v of Object.values(raw._embedded)) {
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}
