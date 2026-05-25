import { unwrapSyncflowList } from '../../utils/syncflowList';

export function normalizeOrderType(typeRaw) {
  const raw = String(typeRaw || '').toUpperCase();
  if (raw === 'TAKEAWAY' || raw === 'PICKUP') return 'pickup';
  if (raw === 'DINE_IN' || raw === 'BOOKING') return 'booking';
  return 'pickup';
}

export function normalizeOrderStatus(statusRaw) {
  const raw = String(statusRaw || '').toUpperCase();
  if (raw === 'PAID') return 'paid';
  if (raw === 'CANCELLED') return 'cancelled';
  if (raw === 'COMPLETED') return 'completed';
  if (raw === 'READY') return 'ready';
  if (raw === 'IN_PROGRESS') return 'in_progress';
  return 'created';
}

/** Статус оплаты: order.status, payment.status и явные флаги с бэкенда. */
export function resolveOrderPaymentStatus(order, normalizedStatus) {
  if (normalizedStatus === 'paid' || normalizedStatus === 'completed') return 'paid';

  const paymentStatusRaw = String(order?.payment?.status ?? order?.paymentStatus ?? '').toUpperCase();
  if (['PAID', 'COMPLETED', 'SUCCESS', 'SUCCEEDED'].includes(paymentStatusRaw)) {
    return 'paid';
  }
  if (order?.payment?.paidAt || order?.paidAt || order?.isPaid === true || order?.paid === true) {
    return 'paid';
  }

  return 'pending';
}

function toNumberSafe(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickFirstFinite(values, fallback = 0) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function itemTitleFromOrderRow(row) {
  const named = String(row?.title ?? row?.dishName ?? row?.dish?.name ?? '').trim();
  if (named) return named;
  const dishId = row?.dishId ?? row?.dish?.id ?? row?.id;
  if (dishId != null && String(dishId).trim()) return `Блюдо №${dishId}`;
  return 'Позиция заказа';
}

function sumOrderLinesTotal(order) {
  const rows = Array.isArray(order?.dishes) ? order.dishes : [];
  if (!rows.length) return 0;
  return rows.reduce((sum, row) => {
    const dishTotal = toNumberSafe(row?.totalPrice ?? row?.total ?? 0, 0);
    const mods = Array.isArray(row?.modificators) ? row.modificators : [];
    const modsTotal = mods.reduce(
      (s, m) => s + toNumberSafe(m?.totalPrice ?? m?.basePrice ?? 0, 0),
      0
    );
    const qty = Math.max(1, Number(row?.quantity || 1));
    const line =
      dishTotal > 0
        ? dishTotal
        : toNumberSafe(row?.priceWithCategory ?? row?.basePrice ?? row?.price ?? 0, 0) * qty;
    return sum + line + modsTotal;
  }, 0);
}

/** Итог к оплате из ответа API (SyncFlow: totalPrice, finalTotal, payment…). */
export function resolveOrderPayableTotal(order, fallback = {}) {
  const candidates = [
    order?.finalTotal,
    order?.totalPrice,
    order?.payment?.totalPrice,
    order?.payment?.finalTotal,
    order?.total,
    order?.totalAmount,
    order?.total_amount,
    fallback?.finalTotal,
    fallback?.total,
    fallback?.totalPrice,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Number(n.toFixed(2));
  }
  const fromLines = sumOrderLinesTotal(order);
  if (fromLines > 0) return Number(fromLines.toFixed(2));
  const subtotal = Number(order?.subtotal ?? fallback?.subtotal);
  if (Number.isFinite(subtotal) && subtotal > 0) return Number(subtotal.toFixed(2));
  return 0;
}

export function mapSyncflowOrderToClient(order, fallback = {}) {
  const id = order?.id != null ? String(order.id) : String(fallback.id || `order-${Date.now()}`);
  const status = normalizeOrderStatus(order?.status ?? fallback?.status);
  const paymentStatus =
    fallback?.paymentStatus === 'paid' ? 'paid' : resolveOrderPaymentStatus(order, status);
  const resolvedStatus = paymentStatus === 'paid' ? 'paid' : status;
  const fromNestedDishes = Array.isArray(order?.dishes) ? order.dishes : [];
  const incomingItems = Array.isArray(order?.items) && order.items.length
    ? order.items
    : fromNestedDishes.length
      ? fromNestedDishes
      : Array.isArray(fallback.items)
        ? fallback.items
        : [];
  const items = incomingItems.map((row) => ({
    id: String(row?.id ?? row?.dishInOrderId ?? row?.dishId ?? row?.dish?.id ?? ''),
    title: itemTitleFromOrderRow(row),
    quantity: Number(row?.quantity || 1),
  }));
  return {
    id,
    createdAt: order?.datetimeOrder || fallback?.createdAt || new Date().toISOString(),
    status: resolvedStatus,
    paymentStatus,
    orderType: normalizeOrderType(order?.orderType || fallback?.orderType),
    total: resolveOrderPayableTotal(order, fallback),
    subtotal: toNumberSafe(
      order?.subtotal ?? order?.grossTotal ?? fallback?.subtotal ?? resolveOrderPayableTotal(order, fallback),
      0
    ),
    discount: toNumberSafe(order?.discount ?? fallback?.discount ?? 0),
    bonusSpent: pickFirstFinite(
      [order?.bonusSpent, order?.spentBonus, order?.bonusSpentAmount, fallback?.bonusSpent],
      0
    ),
    bonusEarned: pickFirstFinite(
      [
        order?.bonusEarned,
        order?.earnedBonus,
        order?.bonusAccrued,
        order?.accruedBonus,
        order?.bonusEarnedAmount,
        fallback?.bonusEarned,
      ],
      0
    ),
    xpEarned: pickFirstFinite([order?.xpEarned, order?.earnedXp, fallback?.xpEarned], 0),
    bookingId: order?.bookingId ?? fallback?.bookingId ?? null,
    scheduledAt: order?.scheduledAt ?? fallback?.scheduledAt ?? null,
    bookingDraft: order?.bookingDraft ?? fallback?.bookingDraft ?? null,
    reviewed: Boolean(order?.reviewed || fallback?.reviewed),
    items,
  };
}

/** GET /api/orders/{orderId}/dishes — строки блюд в заказе (API_DOCS §3.7, §5.2). */
export function mapSyncflowOrderDishesToClientItems(raw) {
  const rows = normalizeSyncflowListResponse(raw);
  return rows.map((row) => ({
    id: String(row?.id ?? row?.dishInOrderId ?? row?.dishInOrder?.id ?? ''),
    title: itemTitleFromOrderRow(row),
    quantity: Math.max(1, Number(row?.quantity || 1)),
  }));
}

/** Spring Data Page / обёртки вместо голого JSON-массива. */
export function normalizeSyncflowListResponse(raw) {
  return unwrapSyncflowList(raw);
}

export function mapSyncflowNotificationToClient(row) {
  const body = String(row?.body || row?.text || '').trim();
  const titleRaw = String(row?.title || '').trim();
  const title = titleRaw || (body ? body.slice(0, 72) + (body.length > 72 ? '…' : '') : 'Сообщение');
  return {
    id: String(row?.id ?? `notif-${Date.now()}`),
    title,
    text: String(row?.body || row?.text || ''),
    read: Boolean(row?.read),
    createdAt: row?.createdAt || new Date().toISOString(),
    type: 'push',
  };
}

export function mapBonusTransactionToClient(row) {
  const typeRaw = String(row?.type || '').toUpperCase();
  const amount = toNumberSafe(row?.amount, 0);
  return {
    id: String(row?.id ?? `tx-${Date.now()}`),
    type: typeRaw === 'SPENDING' ? 'SPENDING' : 'ACCRUAL',
    amount,
    createdAt: row?.createdAt || new Date().toISOString(),
    orderId: row?.orderId != null ? String(row.orderId) : null,
    description: String(row?.description || '').trim(),
  };
}

/** GET /orders/{id}/summary — чек перед оплатой (API_DOCS §4.12, доступно гостю). */
export function mapOrderSummaryToClient(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    orderId: raw.orderId != null ? String(raw.orderId) : null,
    dailyNumber: raw.dailyNumber,
    grossTotal: toNum(raw.grossTotal),
    subtotal: toNum(raw.subtotal),
    finalTotal: toNum(raw.finalTotal != null ? raw.finalTotal : raw.subtotal),
    discounts: Array.isArray(raw.discounts) ? raw.discounts : [],
    serviceCharge: raw.serviceCharge ?? null,
    dishes: Array.isArray(raw.dishes) ? raw.dishes : [],
  };
}

export function mapMenuClientRowToDish(row) {
  const c = row?.category;
  const d = row?.dish;
  if (!d) return null;
  const unitName = d.unit?.name || '';
  const weight =
    d.netWeight != null && unitName
      ? `${d.netWeight} ${unitName}`
      : d.netWeight != null
        ? String(d.netWeight)
        : '';
  const imageUrl = String(d.photoUrl || d.imageUrl || d.image || row.photoUrl || row.imageUrl || row.image || '').trim();
  const ratingRaw = d.rating ?? d.avgRating ?? row.rating ?? row.avgRating;
  const rating = ratingRaw != null && Number.isFinite(Number(ratingRaw)) ? Number(ratingRaw) : null;
  return {
    id: String(d.id),
    menuRowId: row.id != null ? String(row.id) : undefined,
    title: d.name,
    category: c?.name || '',
    price: Number(row.totalDishPrice ?? d.price ?? 0),
    weight,
    rating,
    imageUrl,
    description: d.description || '',
    ingredients: '',
    cookingTime: d.cookingTime || null,
    isAvailable: row.isAvailable !== false,
    availabilityHourFrom: row.availabilityHourFrom || null,
    availabilityHourTo: row.availabilityHourTo || null,
    availabilityDateFrom: row.availabilityDateFrom || null,
    availabilityDateTo: row.availabilityDateTo || null,
  };
}
