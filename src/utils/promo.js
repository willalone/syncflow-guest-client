/**
 * Скидка по ответу POST /api/promo-codes/apply (API_DOCS.md §3.6).
 * @param {number} subtotal — сумма до скидок
 * @param {object|null} promo — { discountValue, isPercentage }
 * @returns {number} скидка в рублях (округление до копеек)
 */
export function calculatePromoDiscountRub(subtotal, promo) {
  if (!promo || subtotal <= 0) return 0;
  const value = Number(promo.discountValue ?? promo.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (promo.isPercentage) {
    return Math.min(subtotal, Number(((subtotal * value) / 100).toFixed(2)));
  }
  return Math.min(subtotal, Number(value.toFixed(2)));
}
