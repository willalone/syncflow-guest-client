import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@mobile_employee/paid_order_ids';

function normalizeOrderId(id) {
  return String(id ?? '').trim();
}

export async function readPaidOrderIds() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(normalizeOrderId).filter(Boolean));
  } catch {
    return new Set();
  }
}

export async function markOrderPaidLocally(orderId) {
  const key = normalizeOrderId(orderId);
  if (!key || key.startsWith('reservation-preorder-')) return;
  const set = await readPaidOrderIds();
  set.add(key);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // no-op
  }
}

/** Помечает заказ оплаченным в списке (после PATCH /pay и при загрузке с сервера). */
export function applyLocalPaidOrders(orders, paidIds) {
  if (!paidIds?.size) return orders;
  return orders.map((order) => {
    const id = normalizeOrderId(order?.id);
    if (!id || !paidIds.has(id)) return order;
    return {
      ...order,
      paymentStatus: 'paid',
      status: order?.status === 'cancelled' ? order.status : 'paid',
    };
  });
}
