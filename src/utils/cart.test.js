import { buildCartPayableBreakdown, calculateCartTotal, getCartCount } from './cart';

const dishes = [
  { id: 'a', price: 100 },
  { id: 'b', price: 250 },
];

describe('cart utils', () => {
  test('calculates total from quantities', () => {
    const total = calculateCartTotal(
      [
        { id: 'a', quantity: 2 },
        { id: 'b', quantity: 1 },
      ],
      dishes
    );

    expect(total).toBe(450);
  });

  test('returns cart items count', () => {
    const count = getCartCount([
      { id: 'a', quantity: 2 },
      { id: 'b', quantity: 3 },
    ]);

    expect(count).toBe(5);
  });

  test('buildCartPayableBreakdown applies promo, guest % and points cap', () => {
    const breakdown = buildCartPayableBreakdown({
      cartItems: [{ id: 'a', quantity: 1 }],
      dishes,
      appliedPromo: { discountValue: 10, isPercentage: true },
      usePoints: true,
      pointsToSpendRaw: '999',
      loyaltyPoints: 500,
      guestDiscountPercentage: 20,
    });
    expect(breakdown.subtotal).toBe(100);
    expect(breakdown.promoRub).toBe(10);
    expect(breakdown.guestDiscountRub).toBe(18);
    expect(breakdown.maxPointsAllowed).toBe(Math.floor(72 * 0.5));
    expect(breakdown.pointsDiscountRub).toBe(breakdown.maxPointsAllowed);
    expect(breakdown.payable).toBeGreaterThanOrEqual(0);
  });

  test('includes modifier prices in total', () => {
    const total = calculateCartTotal(
      [{ id: 'a', quantity: 1, modifiers: [{ price: 50 }] }],
      dishes,
    );
    expect(total).toBe(150);
  });
});
