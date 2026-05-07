import { calculateCartTotal, getCartCount } from './cart';

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
});
