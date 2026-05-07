import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as clientApi from '../services/api/clientApi';
import { runtimeConfig } from '../config/runtimeConfig';
import { normalizeMenuClientPayload, normalizeTablesClientPayload } from '../utils/resolveMediaUrl';
import { mapSyncflowReservationToBooking } from '../utils/bookingMap';
import { useAuth } from './AuthContext';

const ClientDataContext = createContext();
const cartKey = (userId) => `client_cart_${userId || 'guest'}`;
const menuCacheKey = 'cache_menu_v9';
const tablesCacheKey = 'cache_tables_v9';
const userScopedCacheKey = (userId) => `cache_user_scope_${userId || 'guest'}`;
const mockCleanupDoneKey = (userId) => `client_mock_cleanup_done_${userId || 'guest'}`;
const ORDERS_PAGE_LIMIT = 30;
const NOTIFICATIONS_PAGE_LIMIT = 50;

async function cleanupLegacyMockState(userId) {
  const keysToRemove = [
    `client_bookings_${userId}`,
    `client_orders_${userId}`,
    `client_profile_${userId}`,
    `client_favorites_${userId}`,
    `client_notifications_${userId}`,
    userScopedCacheKey(userId),
  ];
  await AsyncStorage.multiRemove(keysToRemove);
}

async function readJson(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op cache write failure
  }
}

function uniqueStringArray(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((item) => String(item)))];
}

export function useClientData() {
  const context = useContext(ClientDataContext);
  if (!context) {
    throw new Error('useClientData must be used within ClientDataProvider');
  }
  return context;
}

export function ClientDataProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated ? user?.id : 'guest';
  const [menu, setMenu] = useState({ dishes: [], categories: ['Все'] });
  const [tables, setTables] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [profile, setProfile] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [ordersHasMore, setOrdersHasMore] = useState(false);
  const [notificationsHasMore, setNotificationsHasMore] = useState(false);
  const [isLoadingMoreOrders, setIsLoadingMoreOrders] = useState(false);
  const [isLoadingMoreNotifications, setIsLoadingMoreNotifications] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);

  useEffect(() => {
    async function bootstrap() {
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

        if (cachedMenu?.data) setMenu(normalizeMenuClientPayload(cachedMenu.data));
        if (cachedTables?.data) setTables(normalizeTablesClientPayload(cachedTables.data));
        if (Array.isArray(cartRaw)) setCartItems(cartRaw);

        if (isAuthenticated && cachedUserScope?.data) {
          const { bookings: cBookings = [], orders: cOrders = [], profile: cProfile = null, favorites: cFavorites = [], notifications: cNotifications = [] } = cachedUserScope.data;
          setBookings(cBookings);
          setOrders(cOrders);
          setProfile(cProfile);
          setFavorites(cFavorites);
          setNotifications(cNotifications);
        } else if (!isAuthenticated) {
          setBookings([]);
          setOrders([]);
          setProfile(null);
          setFavorites([]);
          setNotifications([]);
        }

        setIsBootstrapping(false);

        // Меню (GET /menu/client) публичное; столы требуют Bearer. Не объединять в Promise.all —
        // иначе при госте без токена 401 на /tables отменяет обновление меню.
        try {
          const menuRaw = await clientApi.fetchMenu();
          const menuData = normalizeMenuClientPayload(menuRaw);
          setMenu(menuData);
          await writeJson(menuCacheKey, { updatedAt: Date.now(), data: menuData });
        } catch (e) {
          console.warn('[ClientData] menu fetch failed, остаётся кэш', e?.message || e);
        }
        try {
          const tablesRaw = await clientApi.fetchTables();
          const tablesData = normalizeTablesClientPayload(tablesRaw);
          setTables(tablesData);
          await writeJson(tablesCacheKey, { updatedAt: Date.now(), data: tablesData });
        } catch (e) {
          console.warn('[ClientData] tables fetch failed, остаётся кэш', e?.message || e);
        }

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
          const profileData = profileRes.status === 'fulfilled' && profileRes.value ? profileRes.value : null;
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
        setIsBootstrapping(false);
      }
    }
    bootstrap();
  }, [userId, isAuthenticated]);

  const persistCart = useCallback(async (next) => {
    setCartItems(next);
    await writeJson(cartKey(userId), next);
  }, [userId]);

  const addToCart = useCallback(async (dishId, quantity) => {
    const existing = cartItems.find((item) => item.id === dishId);
    const next = existing
      ? cartItems.map((item) => (item.id === dishId ? { ...item, quantity: item.quantity + quantity } : item))
      : [...cartItems, { id: dishId, quantity }];
    await persistCart(next);
  }, [cartItems, persistCart]);

  const changeCartQty = useCallback(async (dishId, delta) => {
    const next = cartItems
      .map((item) => (item.id === dishId ? { ...item, quantity: item.quantity + delta } : item))
      .filter((item) => item.quantity > 0);
    await persistCart(next);
  }, [cartItems, persistCart]);

  const clearCart = useCallback(async () => {
    setAppliedPromo(null);
    await persistCart([]);
  }, [persistCart]);

  const clearPromo = useCallback(() => setAppliedPromo(null), []);

  const applyPromo = useCallback(async (code) => {
    const trimmed = String(code || '').trim();
    if (!trimmed) {
      throw new Error('Введите промокод.');
    }
    const r = await clientApi.applyPromoCode(trimmed);
    setAppliedPromo(r);
    return r;
  }, []);

  const spendGuestBonus = useCallback(
    async ({ amount, orderId }) => {
      await clientApi.spendBonusPoints({
        amount: Number(amount),
        orderId: Number(orderId),
      });
      try {
        const profileData = await clientApi.fetchUserProfile(userId);
        setProfile(profileData);
      } catch {
        // no-op
      }
    },
    [userId]
  );

  const fetchBookingDetail = useCallback(async (id) => {
    const raw = await clientApi.fetchReservationById(id);
    if (!raw) return null;
    return mapSyncflowReservationToBooking(raw);
  }, []);

  const createBooking = useCallback(async (payload) => {
    const booking = await clientApi.createBooking(payload, userId);
    setBookings((prev) => [booking, ...prev]);
    const updatedNotifications = await clientApi.fetchNotifications(userId, { limit: NOTIFICATIONS_PAGE_LIMIT, offset: 0 });
    setNotifications(updatedNotifications);
    return booking;
  }, [userId]);

  const createOrder = useCallback(async (payload) => {
    const order = await clientApi.createOrder(payload, userId);
    setOrders((prev) => [order, ...prev]);

    // Optimistic local balance + notifications so user always sees spending/earning immediately.
    setProfile((prev) => {
      if (!prev) return prev;
      const spent = Number(order?.bonusSpent || 0);
      const earned = Number(order?.bonusEarned || 0);
      const nextPoints = Math.max(0, Number(prev.loyaltyPoints || 0) - spent + earned);
      return { ...prev, loyaltyPoints: nextPoints };
    });
    setNotifications((prev) => {
      const next = [...(prev || [])];
      const stamp = new Date().toISOString();
      const spent = Number(order?.bonusSpent || 0);
      const earned = Number(order?.bonusEarned || 0);
      if (spent > 0) {
        next.unshift({
          id: `n-local-spent-${Date.now()}`,
          type: 'bonus_spent',
          title: 'Бонусы списаны',
          text: `Заказ на ${Number(order?.subtotal || order?.total || 0)} руб.: списано ${spent} баллов, скидка ${Number(order?.discount || 0)} руб.`,
          createdAt: stamp,
        });
      }
      if (earned > 0) {
        next.unshift({
          id: `n-local-earned-${Date.now()}`,
          type: 'bonus_earned',
          title: 'Начислены бонусы за заказ',
          text: `+${earned} бонусов начислено за заказ.`,
          createdAt: stamp,
        });
      }
      return next;
    });

    try {
      const [updatedProfile, updatedNotifications] = await Promise.all([
        clientApi.fetchUserProfile(userId),
        clientApi.fetchNotifications(userId, { limit: NOTIFICATIONS_PAGE_LIMIT, offset: 0 }),
      ]);
      setProfile(updatedProfile);
      setNotifications(updatedNotifications);
    } catch {
      // keep optimistic state when network is unstable
    }
    return order;
  }, [userId]);

  const payOrder = useCallback(async (orderId) => {
    const updated = await clientApi.payOrder(orderId, userId);
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, paymentStatus: updated?.paymentStatus || 'paid', status: updated?.status || 'confirmed' } : order
      )
    );
    try {
      const updatedNotifications = await clientApi.fetchNotifications(userId, { limit: NOTIFICATIONS_PAGE_LIMIT, offset: 0 });
      setNotifications(updatedNotifications);
    } catch {
      // no-op: keep current state when network is unstable
    }
    try {
      const [latestOrders, latestProfile] = await Promise.all([
        clientApi.fetchOrders(userId, { limit: ORDERS_PAGE_LIMIT, offset: 0 }),
        clientApi.fetchUserProfile(userId),
      ]);
      setOrders(latestOrders);
      setProfile(latestProfile);
    } catch {
      // keep optimistic state if refresh fails
    }
    return updated;
  }, [userId]);

  const requestWaiterCall = useCallback(
    async (payload) => {
      await clientApi.requestWaiterCall(payload || {}, userId);
      try {
        const updatedNotifications = await clientApi.fetchNotifications(userId, {
          limit: NOTIFICATIONS_PAGE_LIMIT,
          offset: 0,
        });
        setNotifications(updatedNotifications);
      } catch {
        // keep UI responsive if refresh fails
      }
    },
    [userId]
  );

  const submitOrderReview = useCallback(async (orderId, payload) => {
    await clientApi.submitOrderReview(orderId, payload, userId);
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              reviewed: true,
              review: {
                rating: Number(payload?.rating || 5),
                comment: String(payload?.comment || ''),
                createdAt: new Date().toISOString(),
              },
            }
          : order
      )
    );
    try {
      const updatedNotifications = await clientApi.fetchNotifications(userId, { limit: NOTIFICATIONS_PAGE_LIMIT, offset: 0 });
      setNotifications(updatedNotifications);
    } catch {
      // no-op: keep current state when network is unstable
    }
    return true;
  }, [userId]);

  const registerPushDevice = useCallback(async (payload) => {
    if (!isAuthenticated) return false;
    await clientApi.registerPushDevice(userId, payload);
    return true;
  }, [isAuthenticated, userId]);

  const sendTestPush = useCallback(async (payload) => {
    if (!isAuthenticated) return false;
    await clientApi.sendTestPush(userId, payload);
    const updatedNotifications = await clientApi.fetchNotifications(userId, { limit: NOTIFICATIONS_PAGE_LIMIT, offset: 0 });
    setNotifications(updatedNotifications);
    return true;
  }, [isAuthenticated, userId]);

  const saveProfile = useCallback(async (patch) => {
    const next = await clientApi.updateUserProfile(userId, patch);
    setProfile(next);
    return next;
  }, [userId]);

  const toggleFavorite = useCallback(async (dishId) => {
    const next = await clientApi.toggleFavorite(userId, dishId);
    setFavorites(uniqueStringArray(next));
  }, [userId]);

  const loadMoreOrders = useCallback(async () => {
    if (!isAuthenticated || isLoadingMoreOrders || !ordersHasMore) return;
    setIsLoadingMoreOrders(true);
    try {
      const nextChunk = await clientApi.fetchOrders(userId, {
        limit: ORDERS_PAGE_LIMIT,
        offset: orders.length,
      });
      if (!Array.isArray(nextChunk) || !nextChunk.length) {
        setOrdersHasMore(false);
        return;
      }
      setOrders((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        nextChunk.forEach((item) => {
          if (!seen.has(item.id)) merged.push(item);
        });
        return merged;
      });
      setOrdersHasMore(nextChunk.length >= ORDERS_PAGE_LIMIT);
    } finally {
      setIsLoadingMoreOrders(false);
    }
  }, [isAuthenticated, isLoadingMoreOrders, ordersHasMore, userId, orders.length]);

  const loadMoreNotifications = useCallback(async () => {
    if (!isAuthenticated || isLoadingMoreNotifications || !notificationsHasMore) return;
    setIsLoadingMoreNotifications(true);
    try {
      const nextChunk = await clientApi.fetchNotifications(userId, {
        limit: NOTIFICATIONS_PAGE_LIMIT,
        offset: notifications.length,
      });
      if (!Array.isArray(nextChunk) || !nextChunk.length) {
        setNotificationsHasMore(false);
        return;
      }
      setNotifications((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        nextChunk.forEach((item) => {
          if (!seen.has(item.id)) merged.push(item);
        });
        return merged;
      });
      setNotificationsHasMore(nextChunk.length >= NOTIFICATIONS_PAGE_LIMIT);
    } finally {
      setIsLoadingMoreNotifications(false);
    }
  }, [isAuthenticated, isLoadingMoreNotifications, notificationsHasMore, userId, notifications.length]);

  const value = useMemo(
    () => ({
      menu,
      tables,
      bookings,
      orders,
      cartItems,
      profile,
      favorites,
      notifications,
      isBootstrapping,
      ordersHasMore,
      notificationsHasMore,
      isLoadingMoreOrders,
      isLoadingMoreNotifications,
      appliedPromo,
      applyPromo,
      clearPromo,
      spendGuestBonus,
      fetchBookingDetail,
      addToCart,
      changeCartQty,
      clearCart,
      createBooking,
      createOrder,
      payOrder,
      submitOrderReview,
      registerPushDevice,
      sendTestPush,
      requestWaiterCall,
      saveProfile,
      toggleFavorite,
      loadMoreOrders,
      loadMoreNotifications,
    }),
    [
      menu, tables, bookings, orders, cartItems, profile, favorites, notifications, isBootstrapping,
      ordersHasMore, notificationsHasMore, isLoadingMoreOrders, isLoadingMoreNotifications,
      appliedPromo, applyPromo, clearPromo, spendGuestBonus, fetchBookingDetail,
      addToCart, changeCartQty, clearCart, createBooking, createOrder, payOrder, submitOrderReview,
      registerPushDevice, sendTestPush, requestWaiterCall, saveProfile, toggleFavorite, loadMoreOrders, loadMoreNotifications,
    ]
  );

  return <ClientDataContext.Provider value={value}>{children}</ClientDataContext.Provider>;
}
