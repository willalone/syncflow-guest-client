import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  enrichOrdersWithReviewState,
  isOrderReviewed,
  markOrderAsReviewed,
  normalizeOrderIdKey,
} from './orderReviews';

describe('orderReviews', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('normalizes order ids', () => {
    expect(normalizeOrderIdKey('order-93')).toBe('93');
    expect(normalizeOrderIdKey('93')).toBe('93');
  });

  it('marks one order reviewed and enriches list', async () => {
    await markOrderAsReviewed('user-1', 'order-10', { rating: 5, comment: 'Отлично' });
    expect(await isOrderReviewed('user-1', '10')).toBe(true);
    expect(await isOrderReviewed('user-1', 'order-99')).toBe(false);

    const enriched = await enrichOrdersWithReviewState(
      [
        { id: 'order-10', total: 100 },
        { id: 'order-99', total: 200 },
      ],
      'user-1'
    );
    expect(enriched[0].reviewed).toBe(true);
    expect(enriched[1].reviewed).toBeFalsy();
  });
});
