import { syncflowGuestRequest } from '../../syncflowHttp';
import { applyLocalPaidOrders, markOrderPaidLocally, readPaidOrderIds } from '../../../utils/localPaidOrders';
import {
  mapOrderSummaryToClient,
  mapSyncflowOrderDishesToClientItems,
  mapSyncflowOrderToClient,
  normalizeSyncflowListResponse,
} from '../syncflowMappers';
import { filterOrdersForGuest, readCurrentGuestIdentity } from './guestScope';

async function enrichOrdersMissingLineItems(orders) {
  const targets = orders.filter((o) => (!o.items || !o.items.length) && o.id);
  const concurrency = 4;
  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (o) => {
        try {
          const raw = await syncflowGuestRequest(`/orders/${encodeURIComponent(o.id)}/dishes`);
          o.items = mapSyncflowOrderDishesToClientItems(raw);
        } catch {
          o.items = o.items || [];
        }
      })
    );
  }
}

async function enrichOrdersMissingTotals(orders) {
  const targets = orders.filter((o) => o.id && !(Number(o.total) > 0));
  const concurrency = 4;
  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (o) => {
        try {
          const raw = await syncflowGuestRequest(`/orders/${encodeURIComponent(o.id)}/summary`);
          const summary = mapOrderSummaryToClient(raw);
          if (summary?.finalTotal > 0) {
            o.total = summary.finalTotal;
            if (summary.subtotal > 0) o.subtotal = summary.subtotal;
          }
        } catch {
          // остаётся сумма из списка или 0
        }
      })
    );
  }
}

export async function fetchOrderDishes(orderId) {
  const id = Number(orderId);
  if (!Number.isFinite(id) || id <= 0) return [];
  const raw = await syncflowGuestRequest(`/orders/${encodeURIComponent(id)}/dishes`);
  return mapSyncflowOrderDishesToClientItems(raw);
}

export function fetchOrders(_userId, options = {}) {
  const limit = Number(options?.limit || 30);
  const offset = Number(options?.offset || 0);
  return readCurrentGuestIdentity().then(async (identity) => {
    const [rawOrders, paidIds] = await Promise.all([
      syncflowGuestRequest('/orders/my').catch(() => null),
      readPaidOrderIds(),
    ]);
    const orderRows = normalizeSyncflowListResponse(rawOrders);
    const scoped = filterOrdersForGuest(orderRows, identity);
    const mapped = applyLocalPaidOrders(
      scoped.map((row) => mapSyncflowOrderToClient(row)),
      paidIds
    );
    const slice = mapped.slice(offset, offset + limit);
    await enrichOrdersMissingLineItems(slice);
    await enrichOrdersMissingTotals(slice);
    return slice;
  });
}

export async function createOrder(payload = {}) {
  const fromItems = Array.isArray(payload.items) ? payload.items : [];
  const dishes = fromItems
    .map((row) => {
      const dishInCategoryId = Number(row?.dishInCategoryId);
      const quantity = Math.max(1, Number(row?.quantity || 1));
      const modificatorIds = Array.isArray(row?.modifiers)
        ? row.modifiers.map((m) => Number(m.id)).filter((n) => Number.isFinite(n) && n > 0)
        : [];
      const out = {
        dishInCategoryId,
        quantity,
        modificatorIds: modificatorIds.length ? modificatorIds : undefined,
        note: row?.note != null && String(row.note).trim() ? String(row.note).trim() : undefined,
      };
      return out;
    })
    .filter((row) => Number.isFinite(row.dishInCategoryId) && row.quantity > 0);

  if (fromItems.length && !dishes.length) {
    throw new Error(
      'Не удалось оформить заказ: обновите меню и снова добавьте блюда в корзину (нужен id позиции из меню).'
    );
  }

  const body = dishes.length ? { dishes } : {};
  const created = await syncflowGuestRequest('/orders/my', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const mapped = mapSyncflowOrderToClient(created, {
    ...payload,
    status: 'created',
    paymentStatus: 'pending',
  });
  if (payload?.bookingId != null || payload?.reservationId != null) {
    mapped.orderType = 'booking';
    mapped.bookingId = String(payload.bookingId ?? payload.reservationId ?? '');
    mapped.reservationId = String(payload.reservationId ?? payload.bookingId ?? '');
  }
  return mapped;
}

export async function payOrder(orderId) {
  const paidKey = String(orderId ?? '').trim();
  const updated = await syncflowGuestRequest(`/orders/my/${encodeURIComponent(paidKey)}/pay`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  await markOrderPaidLocally(paidKey);
  const mapped = mapSyncflowOrderToClient(updated, { id: paidKey, status: 'paid', paymentStatus: 'paid' });
  return {
    ...mapped,
    id: String(mapped.id || paidKey),
    paymentStatus: 'paid',
    status: 'paid',
  };
}

export async function fetchOrderSummary(orderId) {
  const id = Number(orderId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const raw = await syncflowGuestRequest(`/orders/${encodeURIComponent(id)}/summary`);
  return mapOrderSummaryToClient(raw);
}

export async function submitOrderReview(orderId, payload, _userId) {
  const stars = Math.min(5, Math.max(1, Math.round(Number(payload?.rating ?? payload?.stars ?? 5))));
  const description = String(payload?.comment ?? payload?.description ?? '').trim() || '—';
  const orderNumericId = Number(String(orderId ?? '').replace(/^order-/i, '').replace(/\D/g, ''));
  const body = { stars, description };
  if (Number.isFinite(orderNumericId) && orderNumericId > 0) {
    body.order = { id: orderNumericId };
    body.orderId = orderNumericId;
  }
  return syncflowGuestRequest('/reviews', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function spendBonusPoints(body) {
  return syncflowGuestRequest('/bonus/my/spend', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
