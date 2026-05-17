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

export function getCartCount(cartItems) {
  return cartItems.reduce((sum, item) => sum + item.quantity, 0);
}
