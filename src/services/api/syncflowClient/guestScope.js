import { readAuthSession } from '../../authSessionStorage';

/** Нормализация телефона для сравнения (E.164-подобный +7…). */
export function normalizePhoneForMatch(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length > 0) return `+${digits}`;
  return '';
}

export function normalizeGuestNameForMatch(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** @typedef {{ guestId: string, phone: string, displayName: string, login: string }} GuestIdentity */

export async function readCurrentGuestIdentity() {
  const session = await readAuthSession();
  const u = session?.user || {};
  const phone = normalizePhoneForMatch(u.phoneNumber || u.phone);
  const displayName = normalizeGuestNameForMatch(
    [u.firstName, u.lastName].filter(Boolean).join(' ')
  );
  return {
    guestId: u.id != null && String(u.id).trim() ? String(u.id).trim() : '',
    phone,
    displayName,
    login: normalizeGuestNameForMatch(u.login),
  };
}

function guestIdFromRecord(row) {
  const candidates = [
    row?.guest?.id,
    row?.guestId,
    row?.guest?.guestId,
    row?.clientId,
    row?.userId,
    row?.recipientId,
    row?.recipient?.id,
    row?.recipientGuest?.id,
    row?.client?.id,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return String(c).trim();
  }
  return '';
}

export function reservationBelongsToGuest(reservation, identity) {
  if (!reservation || !identity) return false;
  const recordGuestId = guestIdFromRecord(reservation);
  if (identity.guestId && recordGuestId && recordGuestId === identity.guestId) {
    return true;
  }
  const recordPhone = normalizePhoneForMatch(reservation.guestPhoneNumber);
  if (identity.phone && recordPhone && recordPhone === identity.phone) {
    return true;
  }
  const recordName = normalizeGuestNameForMatch(reservation.guestName);
  if (identity.displayName && recordName && recordName === identity.displayName) {
    return true;
  }
  return false;
}

export function orderBelongsToGuest(order, identity) {
  if (!order || !identity) return false;
  const recordGuestId = guestIdFromRecord(order);
  if (identity.guestId && recordGuestId && recordGuestId === identity.guestId) {
    return true;
  }
  const recordPhone = normalizePhoneForMatch(
    order.guest?.phoneNumber ?? order.guestPhoneNumber ?? order.phoneNumber
  );
  if (identity.phone && recordPhone && recordPhone === identity.phone) {
    return true;
  }
  return false;
}

export function notificationBelongsToGuest(notification, identity) {
  if (!notification || !identity) return false;
  const recordGuestId = guestIdFromRecord(notification);
  if (identity.guestId && recordGuestId && recordGuestId === identity.guestId) {
    return true;
  }
  return false;
}

export function filterReservationsForGuest(rows, identity) {
  if (!Array.isArray(rows)) return [];
  if (!identity?.guestId && !identity?.phone && !identity?.displayName) return [];
  return rows.filter((row) => reservationBelongsToGuest(row, identity));
}

export function filterNotificationsForGuest(rows, identity) {
  if (!Array.isArray(rows)) return [];
  if (!identity?.guestId) return [];
  const hasGuestLink = rows.some((row) => guestIdFromRecord(row));
  if (!hasGuestLink) return rows;
  return rows.filter((row) => notificationBelongsToGuest(row, identity));
}

export function filterOrdersForGuest(rows, identity) {
  if (!Array.isArray(rows)) return [];
  if (!identity?.guestId && !identity?.phone) return [];
  const hasGuestLink = rows.some(
    (row) => guestIdFromRecord(row) || normalizePhoneForMatch(row?.guest?.phoneNumber)
  );
  if (!hasGuestLink) return rows;
  return rows.filter((row) => orderBelongsToGuest(row, identity));
}
