import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as clientApi from '../services/api/clientApi';
import { runtimeConfig } from '../config/runtimeConfig';
import { normalizeMenuClientPayload, normalizeTablesClientPayload } from '../utils/resolveMediaUrl';
import { logger } from '../utils/logger';
import { sanitizeCartItems } from '../utils/cart';
import {
  cartKey,
  menuCacheKey,
  mockCleanupDoneKey,
  NOTIFICATIONS_PAGE_LIMIT,
  ORDERS_PAGE_LIMIT,
  tablesCacheKey,
  uniqueStringArray,
  userScopedCacheKey,
} from './clientDataUtils';
import { cleanupLegacyMockState, readJson, writeJson } from './clientDataStorage';

export function useClientDataBootstrap({
  userId,
  isAuthenticated,
  setIsBootstrapping,
  setMenu,
  setTables,
  setCartItems,
  setBookings,
  setOrders,
  setProfile,
  setFavorites,
  setNotifications,
  setRecommendedDishes,
  setOrdersHasMore,
  setNotificationsHasMore,
  setNotificationsUnreadCount,
}) {
  useEffect(() => {
    let cancelled = false;
    let bootstrapId = 0;

    async function bootstrap(runId) {
      setIsBootstrapping(true);
      try {
        if (isAuthenticated && !runtimeConfig.useMockApi) {
          const cleanupDone = await AsyncStorage.getItem(mockCleanupDoneKey(userId));
          if (!cleanupDone) {
            await cleanupLegacyMockState(userId);
            await AsyncStorage.setItem(mockCleanupDoneKey(userId), '1');
          }
        }

        const [cachedMenu, cachedTables, cachedUserScope, cartRaw] = await Promise.all([
          readJson(menuCacheKey),
          readJson(tablesCacheKey),
          readJson(userScopedCacheKey(userId)),
          readJson(cartKey(userId), []),
        ]);

        const cachedMenuData = cachedMenu?.data ? normalizeMenuClientPayload(cachedMenu.data) : null;
        if (cachedMenuData && !cancelled) setMenu(cachedMenuData);
        if (cachedTables?.data && !cancelled) setTables(normalizeTablesClientPayload(cachedTables.data));
        if (Array.isArray(cartRaw) && !cancelled) {
          const sanitizedCart = sanitizeCartItems(cartRaw, cachedMenuData?.dishes || []);
          setCartItems(sanitizedCart);
          if (sanitizedCart.length !== cartRaw.length) {
            writeJson(cartKey(userId), sanitizedCart);
          }
        }

        if (isAuthenticated && cachedUserScope?.data) {
          const {
            bookings: cBookings = [],
            orders: cOrders = [],
            profile: cProfile = null,
            favorites: cFavorites = [],
            notifications: cNotifications = [],
          } = cachedUserScope.data;
          if (!cancelled) {
            setBookings(cBookings);
            setOrders(cOrders);
            setProfile(cProfile);
            setFavorites(cFavorites);
            setNotifications(cNotifications);
          }
        } else if (!isAuthenticated) {
          if (!cancelled) {
            setBookings([]);
            setOrders([]);
            setProfile(null);
            setFavorites([]);
            setNotifications([]);
            setNotificationsUnreadCount(0);
          }
        }

        if (!cancelled && runId === bootstrapId) setIsBootstrapping(false);

        const publicRefreshTasks = [
          (async () => {
            try {
              const menuRaw = await clientApi.fetchMenu();
              const menuData = normalizeMenuClientPayload(menuRaw);
              if (!cancelled) {
                setMenu(menuData);
                const storedCart = await readJson(cartKey(userId), []);
                const cartList = Array.isArray(storedCart) ? storedCart : [];
                const sanitizedCart = sanitizeCartItems(cartList, menuData.dishes || []);
                setCartItems(sanitizedCart);
                if (sanitizedCart.length !== cartList.length) {
                  await writeJson(cartKey(userId), sanitizedCart);
                }
              }
              await writeJson(menuCacheKey, { updatedAt: Date.now(), data: menuData });
            } catch (e) {
              const msg = String(e?.message || e || '');
              if (!/aborted/i.test(msg)) logger.warn('[ClientData] menu fetch failed, остаётся кэш', msg);
            }
          })(),
          (async () => {
            if (runtimeConfig.useMockApi || runtimeConfig.integratedBackend !== 'syncflow') return;
            try {
              const rec = await clientApi.fetchMenuRecommended(5);
              const norm = normalizeMenuClientPayload({ dishes: rec, categories: ['Все'] });
              if (!cancelled) setRecommendedDishes(norm.dishes || []);
            } catch (e) {
              const msg = String(e?.message || e || '');
              if (!/aborted/i.test(msg)) logger.warn('[ClientData] recommended menu fetch failed', msg);
              if (!cancelled) setRecommendedDishes([]);
            }
          })(),
        ];

        if (isAuthenticated) {
          publicRefreshTasks.push(
            (async () => {
              try {
                const tablesRaw = await clientApi.fetchTables();
                const tablesData = normalizeTablesClientPayload(tablesRaw);
                if (!cancelled) setTables(tablesData);
                await writeJson(tablesCacheKey, { updatedAt: Date.now(), data: tablesData });
              } catch (e) {
                const msg = String(e?.message || e || '');
                if (!/aborted|авториз|требуется повторный вход/i.test(msg)) {
                  logger.warn('[ClientData] tables fetch failed, остаётся кэш', msg);
                }
              }
            })()
          );
        }

        await Promise.allSettled(publicRefreshTasks);

        if (isAuthenticated) {
          const settled = await Promise.allSettled([
            clientApi.fetchBookings(userId),
            clientApi.fetchOrders(userId, { limit: ORDERS_PAGE_LIMIT, offset: 0 }),
            clientApi.fetchUserProfile(userId),
            clientApi.fetchFavorites(userId),
            clientApi.fetchNotifications(userId, { limit: NOTIFICATIONS_PAGE_LIMIT, offset: 0 }),
          ]);

          const [bookingsRes, ordersRes, profileRes, favoritesRes, notificationsRes] = settled;
          const bookingData = bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value) ? bookingsRes.value : [];
          const ordersData = ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value) ? ordersRes.value : [];
          const profileData =
            profileRes.status === 'fulfilled' && profileRes.value
              ? profileRes.value
              : cachedUserScope?.data?.profile ?? null;
          const favoritesData = favoritesRes.status === 'fulfilled' && Array.isArray(favoritesRes.value) ? favoritesRes.value : [];
          const notificationsData = notificationsRes.status === 'fulfilled' && Array.isArray(notificationsRes.value) ? notificationsRes.value : [];

          if (!cancelled) {
            setBookings(bookingData);
            setOrders(ordersData);
            if (profileData) setProfile(profileData);
            setFavorites(uniqueStringArray(favoritesData));
            setNotifications(notificationsData);
            setOrdersHasMore(ordersData.length >= ORDERS_PAGE_LIMIT);
            setNotificationsHasMore(notificationsData.length >= NOTIFICATIONS_PAGE_LIMIT);
          }

          try {
            const unread = await clientApi.fetchNotificationsUnreadCount(userId);
            if (!cancelled) setNotificationsUnreadCount(Number(unread) || 0);
          } catch {
            if (!cancelled) {
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
      } finally {
        // Всегда снимаем оверлей для актуального запуска (иначе при смене userId касания блокируются навсегда).
        if (runId === bootstrapId) setIsBootstrapping(false);
      }
    }
    bootstrapId += 1;
    const runId = bootstrapId;
    bootstrap(runId);
    return () => {
      cancelled = true;
    };
  }, [
    userId,
    isAuthenticated,
    setIsBootstrapping,
    setMenu,
    setTables,
    setCartItems,
    setBookings,
    setOrders,
    setProfile,
    setFavorites,
    setNotifications,
    setRecommendedDishes,
    setOrdersHasMore,
    setNotificationsHasMore,
    setNotificationsUnreadCount,
  ]);
}
