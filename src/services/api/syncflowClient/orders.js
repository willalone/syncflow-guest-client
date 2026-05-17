import { syncflowGuestRequest } from '../../syncflowHttp';
import {
  mapOrderSummaryToClient,
  mapSyncflowOrderDishesToClientItems,
  mapSyncflowOrderToClient,
} from '../syncflowMappers';

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

export async function fetchOrderDishes(orderId) {
  const id = Number(orderId);
  if (!Number.isFinite(id) || id <= 0) return [];
  const raw = await syncflowGuestRequest(`/orders/${encodeURIComponent(id)}/dishes`);
  return mapSyncflowOrderDishesToClientItems(raw);
}

export function fetchOrders(_userId, options = {}) {
  const limit = Number(options?.limit || 30);
  const offset = Number(options?.offset || 0);
  return syncflowGuestRequest('/orders/my').then(async (rows) => {
    if (!Array.isArray(rows)) return [];
    const mapped = rows
      .map((row) => mapSyncflowOrderToClient(row))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    const slice = mapped.slice(offset, offset + limit);
    await enrichOrdersMissingLineItems(slice);
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
  if (payload?.bookingId != null) {
    mapped.orderType = 'booking';
  }
  return mapped;
}

export async function payOrder(orderId) {
  const updated = await syncflowGuestRequest(`/orders/my/${encodeURIComponent(orderId)}/pay`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  return mapSyncflowOrderToClient(updated, { id: orderId, status: 'paid', paymentStatus: 'paid' });
}

export async function fetchOrderSummary(orderId) {
  const id = Number(orderId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const raw = await syncflowGuestRequest(`/orders/${encodeURIComponent(id)}/summary`);
  return mapOrderSummaryToClient(raw);
}

export async function submitOrderReview(_orderId, payload, _userId) {
  const stars = Math.min(5, Math.max(1, Math.round(Number(payload?.rating ?? payload?.stars ?? 5))));
  const description = String(payload?.comment ?? payload?.description ?? '').trim() || '—';
  return syncflowGuestRequest('/reviews', {
    method: 'POST',
    body: JSON.stringify({ stars, description }),
  });
}

export function spendBonusPoints(body) {
  return syncflowGuestRequest('/bonus/my/spend', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
