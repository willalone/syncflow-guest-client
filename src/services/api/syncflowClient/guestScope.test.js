import {
  filterOrdersForGuest,
  filterReservationsForGuest,
  normalizePhoneForMatch,
  reservationBelongsToGuest,
} from './guestScope';

describe('guestScope', () => {
  const identity = {
    guestId: '7',
    phone: '+79991234567',
    displayName: 'иван петров',
    login: '',
  };

  it('normalizes phones for comparison', () => {
    expect(normalizePhoneForMatch('8 (999) 123-45-67')).toBe('+79991234567');
  });

  it('keeps only guest reservations from staff list', () => {
    const rows = [
      { id: 1, guestPhoneNumber: '+79991234567', guestName: 'Иван Петров' },
      { id: 2, guestPhoneNumber: '+79990000000', guestName: 'Другой Гость' },
      { id: 3, guest: { id: 7 }, guestPhoneNumber: '+79990000000' },
    ];
    const out = filterReservationsForGuest(rows, identity);
    expect(out.map((r) => r.id)).toEqual([1, 3]);
  });

  it('filters orders by guest id when present on rows', () => {
    const rows = [
      { id: 10, guest: { id: 7 } },
      { id: 11, guest: { id: 99 } },
    ];
    expect(filterOrdersForGuest(rows, identity).map((r) => r.id)).toEqual([10]);
  });

  it('matches reservation by guest id', () => {
    expect(reservationBelongsToGuest({ guest: { id: '7' } }, identity)).toBe(true);
    expect(reservationBelongsToGuest({ guest: { id: '99' } }, identity)).toBe(false);
  });
});
