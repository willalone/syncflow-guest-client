jest.mock('../../syncflowHttp', () => ({
  syncflowGuestRequest: jest.fn(),
}));

import { syncflowGuestRequest } from '../../syncflowHttp';
import { applyPromoCode, applyPromoToOrder, tryApplyGuestPersonalDiscount } from './promo';

describe('syncflowClient/promo', () => {
  beforeEach(() => jest.clearAllMocks());

  test('applyPromoCode rejects empty code', async () => {
    await expect(applyPromoCode('  ')).rejects.toThrow(/промокод/i);
  });

  test('applyPromoCode maps response', async () => {
    syncflowGuestRequest.mockResolvedValue({
      name: 'SUMMER',
      code: 'SUMMER',
      value: 15,
      isPercentage: true,
    });
    const promo = await applyPromoCode('summer');
    expect(promo.discountValue).toBe(15);
    expect(promo.isPercentage).toBe(true);
  });

  test('applyPromoToOrder validates ids', async () => {
    await expect(applyPromoToOrder('x', 'CODE')).rejects.toThrow(/заказ/i);
    await expect(applyPromoToOrder(1, '')).rejects.toThrow(/промокод/i);
  });

  test('tryApplyGuestPersonalDiscount returns null without guest discount', async () => {
    syncflowGuestRequest.mockResolvedValue([{ id: 1, isGuestDiscount: false }]);
    await expect(tryApplyGuestPersonalDiscount(5)).resolves.toBeNull();
  });
});
