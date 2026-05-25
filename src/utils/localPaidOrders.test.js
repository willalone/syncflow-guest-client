import { applyLocalPaidOrders } from './localPaidOrders';

describe('applyLocalPaidOrders', () => {
  it('marks matching orders as paid', () => {
    const paid = new Set(['93', '100']);
    const out = applyLocalPaidOrders(
      [
        { id: '93', paymentStatus: 'pending', status: 'created' },
        { id: '94', paymentStatus: 'pending', status: 'created' },
      ],
      paid
    );
    expect(out[0].paymentStatus).toBe('paid');
    expect(out[0].status).toBe('paid');
    expect(out[1].paymentStatus).toBe('pending');
  });
});
