import { calculatePromoDiscountRub } from './promo';

export function calculateCartTotal(cartItems, dishes) {
  return cartItems.reduce((sum, item) => {
    const dish = dishes.find((d) => d.id === item.id);
    if (!dish) {
      return sum;
    }
    return sum + dish.price * item.quantity;
  }, 0);
}

/** Итоги корзины: промо (после apply на сервере), баллы ≤ 50% от суммы после промо. */
export function buildCartPayableBreakdown({
  cartItems,
  dishes,
  appliedPromo,
  usePoints,
  pointsToSpendRaw,
  loyaltyPoints,
}) {
  const subtotal = calculateCartTotal(cartItems, dishes);
  const promoRub = calculatePromoDiscountRub(subtotal, appliedPromo);
  const afterPromo = Math.max(0, Number((subtotal - promoRub).toFixed(2)));
  const maxPointsAllowed = Math.floor(Math.min(Number(loyaltyPoints || 0), afterPromo * 0.5));
  const requested = Number(String(pointsToSpendRaw ?? '').replace(/\D/g, '') || 0);
  const pts = usePoints ? Math.max(0, Math.min(maxPointsAllowed, requested)) : 0;
  const payable = Math.max(0, Number((afterPromo - pts).toFixed(2)));
  return { subtotal, promoRub, afterPromo, pointsDiscountRub: pts, payable, maxPointsAllowed };
}

export function getCartCount(cartItems) {
  return cartItems.reduce((sum, item) => sum + item.quantity, 0);
}
