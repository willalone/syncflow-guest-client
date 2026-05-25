import { calculatePromoDiscountRub } from './promo';

export function calculateCartTotal(cartItems, dishes) {
  return cartItems.reduce((sum, item) => {
    const dish = dishes.find((d) => d.id === item.id);
    if (!dish) {
      return sum;
    }
    const modifiersTotal = (Array.isArray(item.modifiers) ? item.modifiers : []).reduce(
      (sub, modifier) => sub + Number(modifier?.price || 0),
      0
    );
    return sum + (dish.price + modifiersTotal) * item.quantity;
  }, 0);
}

/** Итоги корзины: промо, персональная скидка гостя (% от суммы после промо), баллы ≤ 50% от суммы после скидок. */
export function buildCartPayableBreakdown({
  cartItems,
  dishes,
  appliedPromo,
  usePoints,
  pointsToSpendRaw,
  loyaltyPoints,
  guestDiscountPercentage,
}) {
  const subtotal = calculateCartTotal(cartItems, dishes);
  const promoRub = calculatePromoDiscountRub(subtotal, appliedPromo);
  const afterPromo = Math.max(0, Number((subtotal - promoRub).toFixed(2)));
  const guestPctRaw = Number(guestDiscountPercentage);
  const guestPct =
    Number.isFinite(guestPctRaw) && guestPctRaw > 0 ? Math.min(100, Math.max(0, guestPctRaw)) : 0;
  const guestDiscountRub =
    guestPct > 0 ? Math.max(0, Number(((afterPromo * guestPct) / 100).toFixed(2))) : 0;
  const afterGuestDiscount = Math.max(0, Number((afterPromo - guestDiscountRub).toFixed(2)));
  const maxPointsAllowed = Math.floor(Math.min(Number(loyaltyPoints || 0), afterGuestDiscount * 0.5));
  const requested = Number(String(pointsToSpendRaw ?? '').replace(/\D/g, '') || 0);
  const pts = usePoints ? Math.max(0, Math.min(maxPointsAllowed, requested)) : 0;
  const payable = Math.max(0, Number((afterGuestDiscount - pts).toFixed(2)));
  return {
    subtotal,
    promoRub,
    afterPromo,
    guestDiscountRub,
    afterGuestDiscount,
    pointsDiscountRub: pts,
    payable,
    maxPointsAllowed,
  };
}

/** Строки корзины с quantity > 0 и блюдом из актуального меню (без «мёртвых» id). */
export function getValidCartItems(cartItems, dishes = []) {
  if (!Array.isArray(cartItems)) return [];
  const dishIds = new Set(
    (Array.isArray(dishes) ? dishes : [])
      .map((d) => String(d?.id ?? '').trim())
      .filter(Boolean)
  );
  return cartItems.filter((item) => {
    const qty = Number(item?.quantity ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) return false;
    const id = String(item?.id ?? '').trim();
    if (!id) return false;
    if (dishIds.size === 0) return false;
    return dishIds.has(id);
  });
}

/** Число позиций в корзине: сумма quantity по всем строкам (4× одно блюдо = 4 позиции). */
export function getCartCount(cartItems, dishes = []) {
  return getValidCartItems(cartItems, dishes).reduce((sum, item) => {
    const qty = Number(item?.quantity ?? 0);
    return sum + (Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 0);
  }, 0);
}

/** Убирает пустые и устаревшие строки перед сохранением в AsyncStorage. */
export function sanitizeCartItems(cartItems, dishes = []) {
  return getValidCartItems(cartItems, dishes);
}
