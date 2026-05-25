import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'client_order_reviews_v1_';

export function reviewedOrdersKey(userId) {
  return `${STORAGE_PREFIX}${userId || 'guest'}`;
}

/** Единый ключ заказа: `order-93` и `93` → `93`. */
export function normalizeOrderIdKey(orderId) {
  const raw = String(orderId ?? '').trim();
  if (!raw) return '';
  const stripped = raw.replace(/^order-/i, '');
  const digits = stripped.replace(/\D/g, '');
  return digits || stripped.toLowerCase();
}

async function readReviewMap(userId) {
  try {
    const raw = await AsyncStorage.getItem(reviewedOrdersKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeReviewMap(userId, map) {
  await AsyncStorage.setItem(reviewedOrdersKey(userId), JSON.stringify(map));
}

export async function getOrderReviewRecord(userId, orderId) {
  const key = normalizeOrderIdKey(orderId);
  if (!key) return null;
  const map = await readReviewMap(userId);
  return map[key] || null;
}

export async function isOrderReviewed(userId, orderId) {
  const record = await getOrderReviewRecord(userId, orderId);
  return Boolean(record?.reviewed);
}

export async function markOrderAsReviewed(userId, orderId, payload = {}) {
  const key = normalizeOrderIdKey(orderId);
  if (!key) return;
  const map = await readReviewMap(userId);
  map[key] = {
    reviewed: true,
    rating: Math.max(1, Math.min(5, Math.round(Number(payload?.rating ?? payload?.stars ?? 5)))),
    comment: String(payload?.comment ?? payload?.description ?? '').trim(),
    createdAt: new Date().toISOString(),
  };
  await writeReviewMap(userId, map);
}

export async function assertCanReviewOrder(userId, orderId) {
  if (await isOrderReviewed(userId, orderId)) {
    throw new Error('Отзыв по этому заказу уже оставлен.');
  }
}

export async function enrichOrdersWithReviewState(orders, userId) {
  if (!Array.isArray(orders) || !orders.length || !userId) return orders || [];
  const map = await readReviewMap(userId);
  return orders.map((order) => {
    const key = normalizeOrderIdKey(order.id);
    const local = key ? map[key] : null;
    const serverReviewed = Boolean(order.reviewed);
    const reviewed = serverReviewed || Boolean(local?.reviewed);
    if (!reviewed) return order;
    return {
      ...order,
      reviewed: true,
      review: order.review || (local ? { rating: local.rating, comment: local.comment, createdAt: local.createdAt } : undefined),
    };
  });
}
