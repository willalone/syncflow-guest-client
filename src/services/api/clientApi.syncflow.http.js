import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncflowGuestRequest, syncflowPublicRequest } from '../syncflowHttp';
import { readAuthSession, writeAuthSession } from '../authSessionStorage';
import { mapSyncflowReservationToBooking } from '../../utils/bookingMap';
import { DEFAULT_VENUE_LABEL } from '../../constants/venue';

function favoritesKey(userId) {
  return `guest_favorites_${userId || 'guest'}`;
}

function mapMenuClientRowToDish(row) {
  const c = row?.category;
  const d = row?.dish;
  if (!d) return null;
  const unitName = d.unit?.name || '';
  const weight =
    d.netWeight != null && unitName
      ? `${d.netWeight} ${unitName}`
      : d.netWeight != null
        ? String(d.netWeight)
        : '';
  return {
    id: String(d.id),
    menuRowId: row.id != null ? String(row.id) : undefined,
    title: d.name,
    category: c?.name || '',
    price: Number(row.totalDishPrice ?? d.price ?? 0),
    weight,
    rating: 0,
    imageUrl: '',
    description: d.description || '',
    ingredients: '',
    cookingTime: d.cookingTime || null,
    isAvailable: row.isAvailable !== false,
  };
}

export async function fetchMenu() {
  const raw = await syncflowPublicRequest('/menu/client');
  if (!Array.isArray(raw)) {
    return { categories: ['Все'], dishes: [] };
  }
  const dishes = raw.map(mapMenuClientRowToDish).filter(Boolean);
  const categories = ['Все', ...new Set(dishes.map((d) => d.category).filter(Boolean))];
  return { categories, dishes };
}

function mapTable(t) {
  return {
    id: String(t.id),
    name: `Стол ${t.id}`,
    seats: t.seatCount,
    seatCount: t.seatCount,
    status: String(t.status || '').toLowerCase(),
    address: DEFAULT_VENUE_LABEL,
    from: '10:00',
    to: '23:00',
    imageUrl: '',
  };
}

export async function fetchTables() {
  const rows = await syncflowGuestRequest('/tables');
  if (!Array.isArray(rows)) return [];
  return rows.map(mapTable);
}

function padTimeToHms(t) {
  const [h = '0', m = '0'] = String(t || '00:00').split(':');
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function addTwoHoursHms(hms) {
  const [H, M] = String(hms || '00:00:00')
    .split(':')
    .map((x) => Number(x));
  const startMin = (Number.isFinite(H) ? H : 0) * 60 + (Number.isFinite(M) ? M : 0);
  const endMin = startMin + 120;
  const eh = Math.floor(endMin / 60) % 24;
  const em = endMin % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`;
}

function dateDdMmYyyyToIso(dateStr) {
  const parts = String(dateStr || '').split('.');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!yyyy || !mm || !dd) return null;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
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
  const guestName =
    [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.login || 'Гость';
  const guestPhoneNumber = String(u.phoneNumber || u.phone || '').trim() || '+79000000000';
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

  const created = await syncflowGuestRequest('/reservations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapSyncflowReservationToBooking(created);
}

export async function fetchBookings(_userId) {
  const rows = await syncflowGuestRequest('/reservations');
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => mapSyncflowReservationToBooking(r)).filter(Boolean);
}

export async function fetchReservationById(id) {
  return syncflowGuestRequest(`/reservations/${encodeURIComponent(id)}`);
}

export function fetchDishIngredients(dishId) {
  return syncflowGuestRequest(`/ingredient-in-dish/dish/${encodeURIComponent(dishId)}`);
}

export function fetchDishModifiers(dishId) {
  return syncflowGuestRequest(`/modificator-in-dish/dish/${encodeURIComponent(dishId)}`);
}

export function applyPromoCode(code) {
  return syncflowGuestRequest('/promo-codes/apply', {
    method: 'POST',
    body: JSON.stringify({ code: String(code || '').trim() }),
  });
}

export function spendBonusPoints(body) {
  return syncflowGuestRequest('/bonus/my/spend', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchOrders(_userId, _options) {
  return Promise.resolve([]);
}

export function createOrder() {
  const e = new Error(
    'Заказ из приложения сейчас оформляет персонал в зале. Выберите блюда в корзине и передайте их официанту или оформите бронь.'
  );
  e.code = 'NOT_SUPPORTED';
  throw e;
}

export function payOrder() {
  const e = new Error('Оплату пока нужно провести в зале или уточните у персонала.');
  e.code = 'NOT_SUPPORTED';
  throw e;
}

export async function submitOrderReview(_orderId, payload, _userId) {
  const stars = Math.min(5, Math.max(1, Math.round(Number(payload?.rating ?? payload?.stars ?? 5))));
  const description = String(payload?.comment ?? payload?.description ?? '').trim() || '—';
  return syncflowGuestRequest('/reviews', {
    method: 'POST',
    body: JSON.stringify({ stars, description }),
  });
}

export async function fetchUserProfile(_userId) {
  const session = await readAuthSession();
  const u = session?.user || {};
  let balance = 0;
  try {
    const raw = await syncflowGuestRequest('/bonus/my/balance');
    balance = typeof raw === 'number' ? raw : parseFloat(raw);
  } catch {
    balance = 0;
  }
  if (!Number.isFinite(balance)) balance = 0;
  return {
    id: String(u.id ?? 'guest'),
    firstName: u.firstName,
    lastName: u.lastName,
    displayName: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.login || 'Гость',
    email: u.email || '',
    phone: u.phoneNumber || '',
    phoneNumber: u.phoneNumber || '',
    login: u.login,
    loyaltyPoints: balance,
  };
}

export async function updateUserProfile(_userId, patch) {
  const session = await readAuthSession();
  const user = session?.user || {};
  const nextUser = {
    ...user,
    firstName: patch?.firstName != null ? String(patch.firstName) : user.firstName,
    lastName: patch?.lastName != null ? String(patch.lastName) : user.lastName,
    login: patch?.login != null ? String(patch.login) : user.login,
    email: patch?.email != null ? String(patch.email) : user.email,
  };
  if (session) await writeAuthSession({ ...session, user: nextUser });
  return fetchUserProfile(_userId);
}

export async function fetchFavorites(userId) {
  const raw = await AsyncStorage.getItem(favoritesKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function toggleFavorite(userId, dishId) {
  const current = await fetchFavorites(userId);
  const id = String(dishId);
  const set = new Set(current.map(String));
  if (set.has(id)) set.delete(id);
  else set.add(id);
  const next = [...set];
  await AsyncStorage.setItem(favoritesKey(userId), JSON.stringify(next));
  return next;
}

export function fetchNotifications(_userId, _options) {
  return Promise.resolve([]);
}

export function registerPushDevice(_userId, _payload) {
  return Promise.resolve(null);
}

export function sendTestPush(_userId, _payload) {
  return Promise.resolve(null);
}

export function requestWaiterCall(_payload, _userId) {
  throw new Error('Вызов официанта из приложения пока недоступен — обратитесь к персоналу в зале.');
}
