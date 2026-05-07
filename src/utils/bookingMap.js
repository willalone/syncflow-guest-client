/** Маппинг ответа API бронирований в форму UI списка/карточки. */

import { DEFAULT_VENUE_LABEL } from '../constants/venue';

export function mapReservationStatus(s) {
  const v = String(s || '').toUpperCase();
  if (v === 'RESERVED') return 'confirmed';
  if (v === 'CREATED') return 'created';
  if (v === 'CANCELLED') return 'cancelled';
  if (v === 'COMPLETED') return 'completed';
  return String(s || '').toLowerCase();
}

export function mapSyncflowReservationToBooking(r) {
  if (!r) return null;
  const d = r.reservDate || '';
  const [y, m, day] = d.split('-');
  const dateRu = y && m && day ? `${day}.${m}.${y}` : d;
  const timeShort = (r.reservHourFrom || '00:00:00').slice(0, 5);
  return {
    id: String(r.id),
    date: dateRu,
    time: timeShort,
    people: r.table?.seatCount || 2,
    address: DEFAULT_VENUE_LABEL,
    status: mapReservationStatus(r.status),
    tableId: r.table?.id != null ? String(r.table.id) : '',
    preorder: null,
    guestName: r.guestName,
    guestPhoneNumber: r.guestPhoneNumber,
    reservHourTo: r.reservHourTo,
    raw: r,
  };
}
