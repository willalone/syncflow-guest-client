import { calculatePromoDiscountRub } from './promo';

describe('calculatePromoDiscountRub', () => {
  test('returns 0 without promo or subtotal', () => {
    expect(calculatePromoDiscountRub(100, null)).toBe(0);
    expect(calculatePromoDiscountRub(0, { discountValue: 10 })).toBe(0);
  });

  test('applies fixed rub discount capped by subtotal', () => {
    expect(calculatePromoDiscountRub(500, { discountValue: 120, isPercentage: false })).toBe(120);
    expect(calculatePromoDiscountRub(50, { discountValue: 120, isPercentage: false })).toBe(50);
  });

  test('applies percentage discount', () => {
    expect(calculatePromoDiscountRub(1000, { discountValue: 15, isPercentage: true })).toBe(150);
    expect(calculatePromoDiscountRub(100, { value: 10, isPercentage: true })).toBe(10);
  });
});
