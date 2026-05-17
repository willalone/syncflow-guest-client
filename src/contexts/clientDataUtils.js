export const ORDERS_PAGE_LIMIT = 30;
export const NOTIFICATIONS_PAGE_LIMIT = 50;

export const cartKey = (userId) => `client_cart_${userId || 'guest'}`;
export const menuCacheKey = 'cache_menu_v9';
export const tablesCacheKey = 'cache_tables_v9';
export const userScopedCacheKey = (userId) => `cache_user_scope_${userId || 'guest'}`;
export const mockCleanupDoneKey = (userId) => `client_mock_cleanup_done_${userId || 'guest'}`;

export function uniqueStringArray(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((item) => String(item)))];
}

export function mergeUniqueById(prev, incoming) {
  const seen = new Set((prev || []).map((item) => item.id));
  const merged = [...(prev || [])];
  (incoming || []).forEach((item) => {
    if (!seen.has(item.id)) merged.push(item);
  });
  return merged;
}

export function normalizeModifiers(rawModifiers) {
  return (Array.isArray(rawModifiers) ? rawModifiers : [])
    .map((item) => ({
      id: String(item?.id || ''),
      name: String(item?.name || ''),
      price: Number(item?.price || 0),
      weight: String(item?.weight || ''),
    }))
    .filter((item) => item.id && item.name);
}

export function buildCartItemId(dishId, modifiers, dishInCategoryId = null) {
  const base =
    dishInCategoryId != null && String(dishInCategoryId).trim() !== '' && Number.isFinite(Number(dishInCategoryId))
      ? `mc${Number(dishInCategoryId)}`
      : `d${String(dishId)}`;
  const signature = normalizeModifiers(modifiers)
    .map((item) => `${item.id}:${item.price}`)
    .sort()
    .join('|');
  return `${base}::${signature}`;
}
