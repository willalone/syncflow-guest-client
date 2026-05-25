import { syncflowGuestRequest } from '../../syncflowHttp';
import { readAuthSession } from '../../authSessionStorage';
import { mapSyncflowReservationToBooking, preorderFromSyncflowApi } from '../../../utils/bookingMap';
import { DEFAULT_VENUE_LABEL } from '../../../constants/venue';
import { normalizeSyncflowListResponse } from '../syncflowMappers';
import { getConfiguredHallTables, mergeTableCatalog } from '../../../utils/tableCatalog';
import { addTwoHoursHms, dateDdMmYyyyToIso, padTimeToHms } from './shared';
import {
  filterReservationsForGuest,
  readCurrentGuestIdentity,
} from './guestScope';

function syncflowTimeToHm(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return /^\d{1,2}:\d{2}/.test(s) ? s.slice(0, 5) : null;
}

function mapTable(t) {
  const nameRaw = t?.name != null ? String(t.name).trim() : '';
  const fromRaw = t?.workingHourFrom ?? t?.availableFrom ?? t?.from ?? null;
  const toRaw = t?.workingHourTo ?? t?.availableTo ?? t?.to ?? null;
  const from = syncflowTimeToHm(fromRaw);
  const to = syncflowTimeToHm(toRaw);
  const imageUrl = String(t?.imageUrl || t?.image || '').trim();
  return {
    id: String(t.id),
    name: nameRaw || `Стол №${t.id}`,
    seats: t.seatCount,
    seatCount: t.seatCount,
    status: String(t.status || '').toLowerCase(),
    address: DEFAULT_VENUE_LABEL,
    from,
    to,
    imageUrl,
  };
}

function formatGuestPhoneForReservation(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    throw new Error('Укажите телефон в профиле — он нужен ресторану для бронирования.');
  }
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10) {
    throw new Error('В профиле указан некорректный телефон. Исправьте в разделе «Личные данные».');
  }
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return `+${digits}`;
}

export async function fetchTables(options = {}) {
  const date = String(options?.date || new Date().toISOString().slice(0, 10));
  const from = padTimeToHms(options?.from || '10:00');
  const to = padTimeToHms(options?.to || '23:00');
  const seats = Math.max(1, Number(options?.seats || 1));
  const query = `?date=${encodeURIComponent(date)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&seats=${encodeURIComponent(seats)}`;
  const raw = await syncflowGuestRequest(`/tables/available${query}`);
  return normalizeSyncflowListResponse(raw).map(mapTable);
}

/** Двухчасовые окна за день — union id столов, доступных хотя бы в одном слоте (гостевой API). */
const HALL_DAY_SCAN_SLOTS = [
  { from: '10:00', to: '12:00' },
  { from: '12:00', to: '14:00' },
  { from: '14:00', to: '16:00' },
  { from: '16:00', to: '18:00' },
  { from: '18:00', to: '20:00' },
  { from: '20:00', to: '22:00' },
  { from: '22:00', to: '23:59' },
];

async function fetchAvailableSlice(dateIso, fromHm, toHm, seats = 1) {
  const from = padTimeToHms(fromHm);
  const to = toHm === '23:59' ? '23:59:59' : padTimeToHms(toHm);
  const query = `?date=${encodeURIComponent(dateIso)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&seats=${encodeURIComponent(seats)}`;
  const raw = await syncflowGuestRequest(`/tables/available${query}`);
  return normalizeSyncflowListResponse(raw).map(mapTable);
}

async function fetchCatalogViaDaySlots(dateIso) {
  const batches = await Promise.all(
    HALL_DAY_SCAN_SLOTS.map(async ({ from, to }) => {
      try {
        return await fetchAvailableSlice(dateIso, from, to);
      } catch {
        return [];
      }
    })
  );
  return mergeTableCatalog(...batches);
}

async function fetchAllTablesWideDay(dateIso) {
  try {
    return await fetchAvailableSlice(dateIso, '00:00', '23:59');
  } catch {
    return [];
  }
}

/**
 * Каталог столов для схемы зала (роль CLIENT не имеет GET /api/tables — только /tables/available).
 */
export async function fetchAllTables(options = {}) {
  const dateIso = String(options?.date || new Date().toISOString().slice(0, 10));
  const configured = getConfiguredHallTables();
  const scanned = await fetchCatalogViaDaySlots(dateIso);
  const wide = await fetchAllTablesWideDay(dateIso);
  return mergeTableCatalog(configured, scanned, wide);
}

export async function createBooking(payload, _userId) {
  const session = await readAuthSession();
  const u = session?.user || {};
  const reservDate = dateDdMmYyyyToIso(payload.date);
  if (!reservDate) {
    throw new Error('Некорректная дата бронирования.');
  }
  const reservHourFrom = padTimeToHms(payload.time);
  const reservHourTo = addTwoHoursHms(reservHourFrom);
  const guestName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || String(u.login || '').trim();
  if (!guestName) {
    throw new Error('Укажите в профиле имя и фамилию или логин — так вас увидят в брони.');
  }
  const guestPhoneNumber = formatGuestPhoneForReservation(u.phoneNumber || u.phone);
  const tableId = Number(payload.tableId);
  if (!Number.isFinite(tableId)) {
    throw new Error('Не выбран стол.');
  }

  const body = {
    table: { id: tableId },
    reservDate,
    reservHourFrom,
    reservHourTo,
    guestName,
    guestPhoneNumber,
  };

  const requestBooking = () =>
    syncflowGuestRequest('/reservations', {
      method: 'POST',
      body: JSON.stringify(body),
      timeoutMs: 30000,
    });

  let created;
  try {
    created = await requestBooking();
  } catch (error) {
    const message = String(error?.message || '');
    if (/aborted|timeout/i.test(message)) {
      created = await requestBooking();
    } else {
      throw error;
    }
  }
  return mapSyncflowReservationToBooking(created);
}

export async function fetchBookings(_userId) {
  const identity = await readCurrentGuestIdentity();
  const rows = await syncflowGuestRequest('/reservations');
  if (!Array.isArray(rows)) return [];
  const scoped = filterReservationsForGuest(rows, identity);
  const bookings = scoped.map((r) => mapSyncflowReservationToBooking(r)).filter(Boolean);
  await Promise.all(
    bookings.map(async (b) => {
      try {
        const raw = await syncflowGuestRequest(`/reservations/${encodeURIComponent(b.id)}/preorder`);
        const preorder = preorderFromSyncflowApi(raw, b.time);
        if (preorder) {
          b.preorder = preorder;
        }
      } catch {
        // нет предзаказа или нет прав
      }
    })
  );
  return bookings;
}

export async function fetchReservationById(id) {
  return syncflowGuestRequest(`/reservations/${encodeURIComponent(id)}`);
}

export async function fetchReservationPreorder(reservationId) {
  const rid = String(reservationId || '').trim();
  if (!rid) return [];
  const raw = await syncflowGuestRequest(`/reservations/${encodeURIComponent(rid)}/preorder`);
  return normalizeSyncflowListResponse(raw);
}

export function removeReservationPreorderItem(reservationId, itemId) {
  const rid = String(reservationId || '').trim();
  const iid = String(itemId || '').trim();
  if (!rid || !iid) {
    return Promise.reject(new Error('Некорректные данные для удаления позиции предзаказа.'));
  }
  return syncflowGuestRequest(`/reservations/${encodeURIComponent(rid)}/preorder/${encodeURIComponent(iid)}`, {
    method: 'DELETE',
  });
}

export function addReservationPreorderItem(reservationId, body) {
  const rid = String(reservationId || '').trim();
  if (!rid) return Promise.reject(new Error('Нет бронирования для предзаказа.'));
  const dishInCategoryId = Number(body?.dishInCategoryId);
  if (!Number.isFinite(dishInCategoryId)) {
    return Promise.reject(new Error('Некорректная позиция предзаказа.'));
  }
  const payload = {
    dishInCategoryId,
    quantity: Math.max(1, Number(body?.quantity || 1)),
  };
  if (body?.note != null && String(body.note).trim()) {
    payload.note = String(body.note).trim();
  }
  return syncflowGuestRequest(`/reservations/${encodeURIComponent(rid)}/preorder`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function syncReservationPreorder(reservationId, lines) {
  const rid = String(reservationId || '').trim();
  if (!rid) throw new Error('Нет бронирования для предзаказа.');
  const list = Array.isArray(lines) ? lines : [];
  for (const line of list) {
    const dishInCategoryId = Number(line?.dishInCategoryId);
    if (!Number.isFinite(dishInCategoryId)) continue;
    await addReservationPreorderItem(rid, {
      dishInCategoryId,
      quantity: line?.quantity,
      note: line?.note,
    });
  }
}
