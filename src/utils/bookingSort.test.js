import { bookingSortTimestamp, sortBookingsByDate } from './bookingSort';

describe('bookingSort', () => {
  const bookingsRu = [
    { id: '1', date: '01.06.2026', time: '12:00' },
    { id: '2', date: '15.06.2026', time: '19:00' },
    { id: '3', date: '10.06.2026', time: '18:00' },
  ];

  const bookingsIso = [
    { id: 'a', date: '2026-06-01', time: '12:00' },
    { id: 'b', date: '2026-06-15', time: '19:00' },
    { id: 'c', date: '2026-06-10', time: '18:00' },
  ];

  it('sorts dd.mm.yyyy newest first', () => {
    expect(sortBookingsByDate(bookingsRu, 'desc').map((b) => b.id)).toEqual(['2', '3', '1']);
    expect(sortBookingsByDate(bookingsRu, 'asc').map((b) => b.id)).toEqual(['1', '3', '2']);
  });

  it('sorts yyyy-mm-dd from local API', () => {
    expect(sortBookingsByDate(bookingsIso, 'desc').map((b) => b.id)).toEqual(['b', 'c', 'a']);
    expect(bookingSortTimestamp({ date: '2026-06-15', time: '10:00' })).toBeGreaterThan(
      bookingSortTimestamp({ date: '2026-06-01', time: '23:00' })
    );
  });

  it('uses raw.reservDate from syncflow', () => {
    const t = bookingSortTimestamp({
      id: 'x',
      date: '',
      time: '',
      raw: { reservDate: '2026-12-31', reservHourFrom: '20:00:00' },
    });
    const t2 = bookingSortTimestamp({ id: 'y', date: '01.01.2026', time: '10:00' });
    expect(t).toBeGreaterThan(t2);
  });
});
