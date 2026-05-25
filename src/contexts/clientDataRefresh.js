import * as clientApi from '../services/api/clientApi';
import { runtimeConfig } from '../config/runtimeConfig';
import { normalizeMenuClientPayload, normalizeTablesClientPayload } from '../utils/resolveMediaUrl';
import { logger } from '../utils/logger';
import {
  menuCacheKey,
  NOTIFICATIONS_PAGE_LIMIT,
  ORDERS_PAGE_LIMIT,
  tablesCacheKey,
  uniqueStringArray,
  userScopedCacheKey,
} from './clientDataUtils';
import { readJson, writeJson } from './clientDataStorage';

/**
 * Повторная загрузка данных с API (pull-to-refresh), без блокирующего bootstrap-оверлея.
 */
export async function runClientDataRefresh({
  userId,
  isAuthenticated,
  setMenu,
  setTables,
  setRecommendedDishes,
  setBookings,
  setOrders,
  setProfile,
  setFavorites,
  setNotifications,
  setOrdersHasMore,
  setNotificationsHasMore,
  setNotificationsUnreadCount,
  isCancelled = () => false,
}) {
  const tasks = [
    (async () => {
      try {
        const menuRaw = await clientApi.fetchMenu();
        const menuData = normalizeMenuClientPayload(menuRaw);
        if (!isCancelled()) setMenu(menuData);
        await writeJson(menuCacheKey, { updatedAt: Date.now(), data: menuData });
      } catch (e) {
        const msg = String(e?.message || e || '');
        if (!/aborted/i.test(msg)) logger.warn('[ClientData] refresh menu failed', msg);
      }
    })(),
  ];

  if (!runtimeConfig.useMockApi && runtimeConfig.integratedBackend === 'syncflow') {
    tasks.push(
      (async () => {
        try {
          const rec = await clientApi.fetchMenuRecommended(5);
          const norm = normalizeMenuClientPayload({ dishes: rec, categories: ['Все'] });
          if (!isCancelled()) setRecommendedDishes(norm.dishes || []);
        } catch (e) {
          if (!isCancelled()) setRecommendedDishes([]);
        }
      })()
    );
  }

  if (isAuthenticated) {
    tasks.push(
      (async () => {
        try {
          const tablesRaw = await clientApi.fetchTables();
          const tablesData = normalizeTablesClientPayload(tablesRaw);
          if (!isCancelled()) setTables(tablesData);
          await writeJson(tablesCacheKey, { updatedAt: Date.now(), data: tablesData });
        } catch (e) {
          const msg = String(e?.message || e || '');
          if (!/aborted|авториз|требуется повторный вход/i.test(msg)) {
            logger.warn('[ClientData] refresh tables failed', msg);
          }
        }
      })()
    );
  }

  await Promise.allSettled(tasks);

  if (!isAuthenticated || isCancelled()) return;

  const cachedUserScope = await readJson(userScopedCacheKey(userId));
  const settled = await Promise.allSettled([
    clientApi.fetchBookings(userId),
    clientApi.fetchOrders(userId, { limit: ORDERS_PAGE_LIMIT, offset: 0 }),
    clientApi.fetchUserProfile(userId),
    clientApi.fetchFavorites(userId),
    clientApi.fetchNotifications(userId, { limit: NOTIFICATIONS_PAGE_LIMIT, offset: 0 }),
  ]);

  if (isCancelled()) return;

  const [bookingsRes, ordersRes, profileRes, favoritesRes, notificationsRes] = settled;
  const bookingData = bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value) ? bookingsRes.value : [];
  const ordersData = ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value) ? ordersRes.value : [];
  const profileData =
    profileRes.status === 'fulfilled' && profileRes.value
      ? profileRes.value
      : cachedUserScope?.data?.profile ?? null;
  const favoritesData = favoritesRes.status === 'fulfilled' && Array.isArray(favoritesRes.value) ? favoritesRes.value : [];
  const notificationsData =
    notificationsRes.status === 'fulfilled' && Array.isArray(notificationsRes.value) ? notificationsRes.value : [];

  setBookings(bookingData);
  setOrders(ordersData);
  if (profileData) setProfile(profileData);
  setFavorites(uniqueStringArray(favoritesData));
  setNotifications(notificationsData);
  setOrdersHasMore(ordersData.length >= ORDERS_PAGE_LIMIT);
  setNotificationsHasMore(notificationsData.length >= NOTIFICATIONS_PAGE_LIMIT);

  try {
    const unread = await clientApi.fetchNotificationsUnreadCount(userId);
    if (!isCancelled()) setNotificationsUnreadCount(Number(unread) || 0);
  } catch {
    if (!isCancelled()) {
      setNotificationsUnreadCount(notificationsData.filter((n) => n.read !== true).length);
    }
  }

  await writeJson(userScopedCacheKey(userId), {
    updatedAt: Date.now(),
    data: {
      bookings: bookingData,
      orders: ordersData,
      profile: profileData,
      favorites: favoritesData,
      notifications: notificationsData,
    },
  });
}
