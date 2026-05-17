import { syncflowGuestRequest } from '../../syncflowHttp';
import { normalizeSyncflowListResponse } from '../syncflowMappers';

export async function applyPromoCode(code) {
  const trimmed = String(code || '').trim();
  if (!trimmed) {
    throw new Error('Введите промокод.');
  }
  const raw = await syncflowGuestRequest('/guest/promo/check', {
    method: 'POST',
    body: JSON.stringify({ code: trimmed }),
  });
  const value = Number(raw?.value ?? 0);
  return {
    name: raw?.name,
    code: raw?.code ?? trimmed,
    value,
    discountValue: value,
    isPercentage: Boolean(raw?.isPercentage),
    isActive: true,
  };
}

export function applyPromoToOrder(orderId, code) {
  const id = Number(orderId);
  if (!Number.isFinite(id)) {
    return Promise.reject(new Error('Некорректный заказ для применения промокода.'));
  }
  const trimmed = String(code || '').trim();
  if (!trimmed) {
    return Promise.reject(new Error('Нет промокода.'));
  }
  return syncflowGuestRequest(`/discounts/orders/${encodeURIComponent(id)}/promo`, {
    method: 'POST',
    body: JSON.stringify({ code: trimmed }),
  });
}

export async function tryApplyGuestPersonalDiscount(orderId) {
  const id = Number(orderId);
  if (!Number.isFinite(id) || id <= 0) return null;
  let list;
  try {
    const raw = await syncflowGuestRequest('/discounts');
    list = Array.isArray(raw) ? raw : normalizeSyncflowListResponse(raw);
  } catch {
    return null;
  }
  const guestDiscount = list.find(
    (d) => d && (d.isGuestDiscount === true || String(d.isGuestDiscount).toLowerCase() === 'true')
  );
  const discountId = guestDiscount?.id;
  if (discountId == null || !Number.isFinite(Number(discountId))) return null;
  try {
    return await syncflowGuestRequest(
      `/discounts/orders/${encodeURIComponent(id)}/apply/${encodeURIComponent(discountId)}`,
      { method: 'POST', body: JSON.stringify({}) }
    );
  } catch {
    return null;
  }
}
