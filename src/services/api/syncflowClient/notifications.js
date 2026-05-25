import { syncflowGuestRequest } from '../../syncflowHttp';
import { readAuthSession, writeAuthSession } from '../../authSessionStorage';
import { mapSyncflowNotificationToClient } from '../syncflowMappers';
import { filterNotificationsForGuest, readCurrentGuestIdentity } from './guestScope';

function parseUnreadCountPayload(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  if (typeof raw === 'string' && /^\s*\d+\s*$/.test(raw)) return Math.max(0, parseInt(raw.trim(), 10));
  if (raw && typeof raw === 'object' && raw.count != null) {
    const n = Number(raw.count);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  return 0;
}

export async function fetchNotifications(_userId, options = {}) {
  const identity = await readCurrentGuestIdentity();
  const rows = await syncflowGuestRequest('/notifications/my');
  const scoped = filterNotificationsForGuest(Array.isArray(rows) ? rows : [], identity);
  const list = scoped
    .map(mapSyncflowNotificationToClient)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const offset = Number(options?.offset || 0);
  const limit = Number(options?.limit || 50);
  return list.slice(offset, offset + limit);
}

export async function fetchNotificationsUnreadCount(userId) {
  const list = await fetchNotifications(userId, { limit: 50, offset: 0 });
  return list.filter((n) => n.read !== true).length;
}

export function markNotificationRead(_userId, notificationId) {
  const id = String(notificationId ?? '').trim();
  if (!id) return Promise.reject(new Error('Некорректное уведомление.'));
  return syncflowGuestRequest(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export function markAllNotificationsRead(_userId) {
  return syncflowGuestRequest('/notifications/my/read-all', {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export function registerPushDevice(_userId, payload = {}) {
  const token = String(payload.deviceToken || payload.token || '').trim();
  if (!token) return Promise.resolve(null);
  return syncflowGuestRequest('/notifications/token', {
    method: 'POST',
    body: JSON.stringify({
      token,
      platform: String(payload.platform || 'IOS').toUpperCase() === 'ANDROID' ? 'ANDROID' : 'IOS',
    }),
  }).then(async (result) => {
    const session = await readAuthSession();
    if (session) {
      await writeAuthSession({ ...session, pushDeviceToken: token });
    }
    return result;
  });
}

export async function unregisterPushDevice(token) {
  const raw = String(token || '').trim();
  if (!raw) return null;
  return syncflowGuestRequest(`/notifications/token?token=${encodeURIComponent(raw)}`, {
    method: 'DELETE',
  });
}
