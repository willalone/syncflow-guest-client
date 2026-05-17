import {
  mapReservationStatus,
  mapSyncflowReservationToBooking,
  preorderFromSyncflowApi,
} from './bookingMap';

describe('bookingMap', () => {
  test('mapReservationStatus', () => {
    expect(mapReservationStatus('RESERVED')).toBe('confirmed');
    expect(mapReservationStatus('CANCELLED')).toBe('cancelled');
    expect(mapReservationStatus('unknown')).toBe('unknown');
  });

  test('mapSyncflowReservationToBooking', () => {
    const b = mapSyncflowReservationToBooking({
      id: 5,
      reservDate: '2026-05-15',
      reservHourFrom: '18:30:00',
      status: 'CREATED',
      table: { id: 2, seatCount: 4 },
      guestName: 'Ann',
    });
    expect(b.id).toBe('5');
    expect(b.date).toBe('15.05.2026');
    expect(b.time).toBe('18:30');
    expect(b.status).toBe('created');
    expect(b.people).toBe(4);
  });

  test('preorderFromSyncflowApi maps rows', () => {
    const p = preorderFromSyncflowApi(
      [{ id: 1, dishName: 'Суп', quantity: 2 }],
      '19:00',
    );
    expect(p.items).toHaveLength(1);
    expect(p.items[0].title).toBe('Суп');
    expect(p.servingTime).toBe('19:00');
    expect(preorderFromSyncflowApi([])).toBeNull();
  });
});
