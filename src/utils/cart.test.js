import { buildCartPayableBreakdown, calculateCartTotal, getCartCount, getValidCartItems } from './cart';

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

  test('sums quantities as position count', () => {
    expect(
      getCartCount(
        [
          { id: 'a', quantity: 4 },
          { id: 'b', quantity: 1 },
          { id: 'ghost', quantity: 99 },
        ],
        dishes
      )
    ).toBe(5);

    expect(
      getCartCount(
        [
          { id: 'a', quantity: 4 },
          { id: 'b', quantity: 2 },
        ],
        dishes
      )
    ).toBe(6);
  });

  test('empty cart and orphan lines yield zero count', () => {
    expect(getCartCount([], dishes)).toBe(0);
    expect(getCartCount([{ id: 'missing', quantity: 2 }], dishes)).toBe(0);
    expect(getValidCartItems([{ id: 'a', quantity: 0 }], dishes)).toEqual([]);
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
