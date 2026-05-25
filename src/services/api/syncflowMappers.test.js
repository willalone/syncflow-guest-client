import {
  mapBonusTransactionToClient,
  mapMenuClientRowToDish,
  mapOrderSummaryToClient,
  mapSyncflowNotificationToClient,
  normalizeOrderStatus,
  normalizeOrderType,
  normalizeSyncflowListResponse,
  resolveOrderPaymentStatus,
  mapSyncflowOrderToClient,
  mapSyncflowOrderDishesToClientItems,
  resolveOrderPayableTotal,
} from './syncflowMappers';

describe('syncflowMappers', () => {
  test('normalizeOrderType and normalizeOrderStatus', () => {
    expect(normalizeOrderType('TAKEAWAY')).toBe('pickup');
    expect(normalizeOrderType('DINE_IN')).toBe('booking');
    expect(normalizeOrderStatus('PAID')).toBe('paid');
    expect(normalizeOrderStatus('IN_PROGRESS')).toBe('in_progress');
  });

  test('mapMenuClientRowToDish returns null without dish', () => {
    expect(mapMenuClientRowToDish({ id: 1 })).toBeNull();
  });

  test('mapSyncflowNotificationToClient', () => {
    const n = mapSyncflowNotificationToClient({ id: 3, body: 'Текст уведомления', read: false });
    expect(n.id).toBe('3');
    expect(n.text).toBe('Текст уведомления');
    expect(n.read).toBe(false);
  });

  test('mapBonusTransactionToClient', () => {
    const tx = mapBonusTransactionToClient({ id: 8, type: 'SPENDING', amount: 50 });
    expect(tx.type).toBe('SPENDING');
    expect(tx.amount).toBe(50);
  });

  test('normalizes list wrappers', () => {
    expect(normalizeSyncflowListResponse({ content: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(normalizeSyncflowListResponse([{ id: 2 }])).toEqual([{ id: 2 }]);
    expect(normalizeSyncflowListResponse(null)).toEqual([]);
  });

  test('maps menu row to client dish', () => {
    const dish = mapMenuClientRowToDish({
      id: 11,
      totalDishPrice: 450,
      category: { name: 'Горячее' },
      dish: { id: 7, name: 'Паста', description: 'desc', netWeight: 250, unit: { name: 'г' } },
    });
    expect(dish.id).toBe('7');
    expect(dish.menuRowId).toBe('11');
    expect(dish.price).toBe(450);
    expect(dish.weight).toBe('250 г');
  });

  test('maps order with fallback values', () => {
    const mapped = mapSyncflowOrderToClient({ id: 5, items: [{ dish: { id: 1, name: 'Суп' }, quantity: 2 }] });
    expect(mapped.id).toBe('5');
    expect(mapped.items[0].title).toBe('Суп');
    expect(mapped.items[0].quantity).toBe(2);
  });

  test('resolveOrderPaymentStatus uses payment.status when order.status is CREATED', () => {
    expect(resolveOrderPaymentStatus({ status: 'CREATED', payment: { status: 'PAID' } }, 'created')).toBe(
      'paid'
    );
    expect(
      mapSyncflowOrderToClient({ id: 1, status: 'CREATED', payment: { status: 'PAID' } }).paymentStatus
    ).toBe('paid');
  });

  test('resolveOrderPayableTotal uses totalPrice and finalTotal from API', () => {
    expect(resolveOrderPayableTotal({ totalPrice: 1500 })).toBe(1500);
    expect(resolveOrderPayableTotal({ finalTotal: 1673.1 })).toBe(1673.1);
    expect(
      mapSyncflowOrderToClient({
        id: 3,
        status: 'PAID',
        totalPrice: 2640,
        dishes: [{ dishName: 'Стейк', quantity: 1, totalPrice: 1200 }],
      }).total
    ).toBe(2640);
  });

  test('maps order with nested dishes array when items absent', () => {
    const mapped = mapSyncflowOrderToClient({
      id: 9,
      dishes: [{ id: 101, dishName: 'Борщ', quantity: 1 }],
    });
    expect(mapped.items).toHaveLength(1);
    expect(mapped.items[0].title).toBe('Борщ');
    expect(mapped.items[0].id).toBe('101');
  });

  test('maps GET /orders/{id}/dishes payload', () => {
    const items = mapSyncflowOrderDishesToClientItems([
      { id: 2, dishName: 'Стейк', quantity: 2 },
    ]);
    expect(items[0].title).toBe('Стейк');
    expect(items[0].quantity).toBe(2);
  });

  test('maps order summary', () => {
    const s = mapOrderSummaryToClient({
      orderId: 1,
      grossTotal: 100,
      subtotal: 90,
      finalTotal: 99,
      discounts: [{ name: 'Промо', value: 10 }],
      dishes: [],
    });
    expect(s.finalTotal).toBe(99);
    expect(s.discounts).toHaveLength(1);
  });
});
