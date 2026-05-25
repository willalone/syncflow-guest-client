import {
  bookingWithPreorderToClientOrder,
  mergeOrdersWithReservationPreorders,
  orderMatchesBookingPreorder,
} from './reservationPreorderOrders';

describe('reservationPreorderOrders', () => {
  const booking = {
    id: '42',
    date: '10.05.2026',
    time: '19:30',
    preorder: {
      servingTime: '19:30',
      items: [
        { id: '1', title: 'Стейк', quantity: 1, unitPrice: 1200 },
        { id: '2', title: 'Салат', quantity: 2, unitPrice: 400 },
      ],
    },
  };

  it('builds synthetic order from booking preorder', () => {
    const row = bookingWithPreorderToClientOrder(booking);
    expect(row.id).toBe('reservation-preorder-42');
    expect(row.isReservationPreorder).toBe(true);
    expect(row.total).toBe(2000);
    expect(row.items).toHaveLength(2);
  });

  it('matches order linked by reservationId without comparing dish titles', () => {
    const orders = [{ id: '93', reservationId: '42', items: [], paymentStatus: 'paid' }];
    expect(orderMatchesBookingPreorder(orders[0], booking)).toBe(true);
  });

  it('skips synthetic when API order already matches preorder', () => {
    const orders = [
      {
        id: '93',
        items: [
          { title: 'Стейк', quantity: 1 },
          { title: 'Салат', quantity: 2 },
        ],
      },
    ];
    expect(orderMatchesBookingPreorder(orders[0], booking)).toBe(true);
    const merged = mergeOrdersWithReservationPreorders(orders, [booking]);
    expect(merged).toHaveLength(1);
  });

  it('adds synthetic when no matching order exists', () => {
    const merged = mergeOrdersWithReservationPreorders([], [booking]);
    expect(merged).toHaveLength(1);
    expect(merged[0].isReservationPreorder).toBe(true);
  });
});
