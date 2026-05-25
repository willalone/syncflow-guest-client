import { useCallback, useRef } from 'react';
import * as clientApi from '../services/api/clientApi';
import { mapSyncflowReservationToBooking } from '../utils/bookingMap';
import { normalizeTablesClientPayload } from '../utils/resolveMediaUrl';
import { patchHallTableCatalog } from '../utils/tableCatalog';
import { sanitizeCartItems } from '../utils/cart';
import {
  buildCartItemId,
  mergeUniqueById,
  normalizeModifiers,
  NOTIFICATIONS_PAGE_LIMIT,
  ORDERS_PAGE_LIMIT,
  uniqueStringArray,
} from './clientDataUtils';
import { tablesCacheKey } from './clientDataUtils';
import { writeJson } from './clientDataStorage';

export function useClientDataActions({
  userId,
  isAuthenticated,
  menu,
  cartItems,
  orders,
  notifications,
  ordersHasMore,
  notificationsHasMore,
  isLoadingMoreOrders,
  isLoadingMoreNotifications,
  persistCart,
  persistUserScope,
  setAppliedPromo,
  setProfile,
  setBookings,
  setOrders,
  setNotifications,
  setTables,
  setFavorites,
  setIsLoadingMoreOrders,
  setOrdersHasMore,
  setIsLoadingMoreNotifications,
  setNotificationsHasMore,
  setNotificationsUnreadCount,
}) {
  const addToCart = useCallback(
    async (dishId, quantity, options = {}) => {
      const modifiers = normalizeModifiers(options?.modifiers);
      const dish = menu.dishes.find((d) => String(d.id) === String(dishId));
      const dishInCategoryId =
        dish?.menuRowId != null && String(dish.menuRowId).trim() !== '' ? Number(dish.menuRowId) : null;
      const cartItemId = buildCartItemId(dishId, modifiers, dishInCategoryId);
      const existing = cartItems.find((item) => String(item.cartItemId || item.id) === cartItemId);
      const next = existing
        ? cartItems.map((item) =>
            String(item.cartItemId || item.id) === cartItemId ? { ...item, quantity: item.quantity + quantity } : item
          )
        : [...cartItems, { id: dishId, cartItemId, quantity, modifiers, dishInCategoryId }];
      await persistCart(sanitizeCartItems(next, menu.dishes));
    },
    [cartItems, menu.dishes, persistCart]
  );

  const changeCartQty = useCallback(
    async (dishIdOrCartItemId, delta) => {
      const target = String(dishIdOrCartItemId);
      const next = sanitizeCartItems(
        cartItems
          .map((item) => {
            const byComposite = String(item.cartItemId || '') === target;
            const byDishId = String(item.id) === target;
            return byComposite || byDishId ? { ...item, quantity: item.quantity + delta } : item;
          })
          .filter((item) => item.quantity > 0),
        menu.dishes
      );
      await persistCart(next);
    },
    [cartItems, menu.dishes, persistCart]
  );

  const clearCart = useCallback(async () => {
    setAppliedPromo(null);
    await persistCart([]);
  }, [persistCart, setAppliedPromo]);

  const clearPromo = useCallback(() => setAppliedPromo(null), [setAppliedPromo]);

  const applyPromo = useCallback(async (code) => {
    const trimmed = String(code || '').trim();
    if (!trimmed) throw new Error('Введите промокод.');
    const r = await clientApi.applyPromoCode(trimmed);
    setAppliedPromo(r);
    return r;
  }, [setAppliedPromo]);

  const spendGuestBonus = useCallback(async ({ amount, orderId }) => {
    await clientApi.spendBonusPoints({ amount: Number(amount), orderId: Number(orderId) });
    try {
      const profileData = await clientApi.fetchUserProfile(userId);
      setProfile(profileData);
    } catch {
      // no-op
    }
  }, [userId, setProfile]);

  const fetchBookingDetail = useCallback(async (id) => {
    const raw = await clientApi.fetchReservationById(id);
    if (!raw) return null;
    return mapSyncflowReservationToBooking(raw);
  }, []);

  const createBooking = useCallback(async (payload) => {
    const booking = await clientApi.createBooking(payload, userId);
    let nextBookings = [];
    setBookings((prev) => {
      nextBookings = [booking, ...prev];
      return nextBookings;
    });
    await persistUserScope({ bookings: nextBookings });
    const updatedNotifications = await clientApi.fetchNotifications(userId, { limit: NOTIFICATIONS_PAGE_LIMIT, offset: 0 });
    setNotifications(updatedNotifications);
    try {
      const c = await clientApi.fetchNotificationsUnreadCount(userId);
      setNotificationsUnreadCount(Number(c) || 0);
    } catch {
      setNotificationsUnreadCount(updatedNotifications.filter((n) => n.read !== true).length);
    }
    return booking;
  }, [userId, setBookings, setNotifications, setNotificationsUnreadCount, persistUserScope]);

  const createOrder = useCallback(async (payload) => {
    const order = await clientApi.createOrder(payload, userId);
    let nextOrders = [];
    setOrders((prev) => {
      nextOrders = [order, ...prev];
      return nextOrders;
    });

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
      try {
        const c = await clientApi.fetchNotificationsUnreadCount(userId);
        setNotificationsUnreadCount(Number(c) || 0);
      } catch {
        setNotificationsUnreadCount(updatedNotifications.filter((n) => n.read !== true).length);
      }
    } catch {
      // keep optimistic state when network is unstable
    }
    await persistUserScope({ orders: nextOrders });
    return order;
  }, [userId, setOrders, setProfile, setNotifications, setNotificationsUnreadCount, persistUserScope]);

  const payOrder = useCallback(async (orderId) => {
    const paidKey = String(orderId ?? '').trim();
    const updated = await clientApi.payOrder(orderId, userId);
    const paidSnapshot = {
      ...updated,
      id: String(updated?.id ?? paidKey),
      paymentStatus: 'paid',
      status: 'paid',
    };

    const mergePaid = (list) =>
      (Array.isArray(list) ? list : []).map((order) =>
        String(order.id) === paidKey ? { ...order, ...paidSnapshot } : order
      );

    let nextOrders = [];
    setOrders((prev) => {
      nextOrders = mergePaid(prev);
      return nextOrders;
    });
    await persistUserScope({ orders: nextOrders });

    try {
      const updatedNotifications = await clientApi.fetchNotifications(userId, { limit: NOTIFICATIONS_PAGE_LIMIT, offset: 0 });
      setNotifications(updatedNotifications);
      try {
        const c = await clientApi.fetchNotificationsUnreadCount(userId);
        setNotificationsUnreadCount(Number(c) || 0);
      } catch {
        setNotificationsUnreadCount(updatedNotifications.filter((n) => n.read !== true).length);
      }
    } catch {}

    try {
      const latestProfile = await clientApi.fetchUserProfile(userId);
      setProfile(latestProfile);
    } catch {}

    try {
      const latestOrders = await clientApi.fetchOrders(userId, { limit: ORDERS_PAGE_LIMIT, offset: 0 });
      const merged = mergePaid(latestOrders);
      setOrders(merged);
      await persistUserScope({ orders: merged });
    } catch {
      // локальный кэш оплаты + mergePaid(prev) уже показывают «Оплачен»
    }

    return paidSnapshot;
  }, [userId, setOrders, setNotifications, setProfile, setNotificationsUnreadCount, persistUserScope]);

  const submitOrderReview = useCallback(async (orderId, payload) => {
    await clientApi.submitOrderReview(orderId, payload, userId);
    const reviewMeta = {
      rating: Number(payload?.rating || 5),
      comment: String(payload?.comment || ''),
      createdAt: new Date().toISOString(),
    };
    setOrders((prev) =>
      prev.map((order) => {
        const same =
          String(order.id) === String(orderId) ||
          String(order.id).replace(/^order-/i, '') === String(orderId).replace(/^order-/i, '');
        if (!same) return order;
        return { ...order, reviewed: true, review: reviewMeta };
      })
    );
    try {
      const updatedNotifications = await clientApi.fetchNotifications(userId, { limit: NOTIFICATIONS_PAGE_LIMIT, offset: 0 });
      setNotifications(updatedNotifications);
      try {
        const c = await clientApi.fetchNotificationsUnreadCount(userId);
        setNotificationsUnreadCount(Number(c) || 0);
      } catch {
        setNotificationsUnreadCount(updatedNotifications.filter((n) => n.read !== true).length);
      }
    } catch {}
    return true;
  }, [userId, setOrders, setNotifications, setNotificationsUnreadCount]);

  const registerPushDevice = useCallback(async (payload) => {
    if (!isAuthenticated) return false;
    await clientApi.registerPushDevice(userId, payload);
    return true;
  }, [isAuthenticated, userId]);

  const refreshAvailableTables = useCallback(async (options = {}) => {
    if (!isAuthenticated) return [];
    const tablesRaw = await clientApi.fetchTables(options);
    const tablesData = normalizeTablesClientPayload(tablesRaw);
    setTables(tablesData);
    if (tablesData.length) await patchHallTableCatalog(tablesData);
    await writeJson(tablesCacheKey, { updatedAt: Date.now(), data: tablesData });
    return tablesData;
  }, [isAuthenticated, setTables]);

  const saveProfileInFlightRef = useRef(false);
  const saveProfile = useCallback(async (patch) => {
    if (saveProfileInFlightRef.current) {
      throw new Error('Сохранение профиля уже выполняется. Подождите.');
    }
    saveProfileInFlightRef.current = true;
    try {
      const next = await clientApi.updateUserProfile(userId, patch);
      setProfile(next);
      await persistUserScope({ profile: next });
      return next;
    } finally {
      saveProfileInFlightRef.current = false;
    }
  }, [userId, setProfile, persistUserScope]);

  const toggleFavorite = useCallback(async (dishId) => {
    const next = await clientApi.toggleFavorite(userId, dishId);
    const normalized = uniqueStringArray(next);
    setFavorites(normalized);
    await persistUserScope({ favorites: normalized });
  }, [userId, setFavorites, persistUserScope]);

  const loadMoreOrders = useCallback(async () => {
    if (!isAuthenticated || isLoadingMoreOrders || !ordersHasMore) return;
    setIsLoadingMoreOrders(true);
    try {
      const nextChunk = await clientApi.fetchOrders(userId, { limit: ORDERS_PAGE_LIMIT, offset: orders.length });
      if (!Array.isArray(nextChunk) || !nextChunk.length) {
        setOrdersHasMore(false);
        return;
      }
      setOrders((prev) => mergeUniqueById(prev, nextChunk));
      setOrdersHasMore(nextChunk.length >= ORDERS_PAGE_LIMIT);
    } finally {
      setIsLoadingMoreOrders(false);
    }
  }, [isAuthenticated, isLoadingMoreOrders, ordersHasMore, userId, orders.length, setOrdersHasMore, setIsLoadingMoreOrders, setOrders]);

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
      setNotifications((prev) => mergeUniqueById(prev, nextChunk));
      setNotificationsHasMore(nextChunk.length >= NOTIFICATIONS_PAGE_LIMIT);
    } finally {
      setIsLoadingMoreNotifications(false);
    }
  }, [
    isAuthenticated,
    isLoadingMoreNotifications,
    notificationsHasMore,
    userId,
    notifications.length,
    setIsLoadingMoreNotifications,
    setNotificationsHasMore,
    setNotifications,
  ]);

  const markNotificationRead = useCallback(
    async (notificationId) => {
      if (!isAuthenticated) return;
      try {
        await clientApi.markNotificationRead(userId, notificationId);
      } catch {
        // still update UI locally
      }
      setNotifications((prev) =>
        (prev || []).map((n) => (String(n.id) === String(notificationId) ? { ...n, read: true } : n))
      );
      try {
        const c = await clientApi.fetchNotificationsUnreadCount(userId);
        setNotificationsUnreadCount(Number(c) || 0);
      } catch {
        setNotificationsUnreadCount((prev) => Math.max(0, prev - 1));
      }
    },
    [isAuthenticated, userId, setNotifications, setNotificationsUnreadCount]
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      await clientApi.markAllNotificationsRead(userId);
    } catch {
      // ignore
    }
    setNotifications((prev) => (prev || []).map((n) => ({ ...n, read: true })));
    setNotificationsUnreadCount(0);
  }, [isAuthenticated, userId, setNotifications, setNotificationsUnreadCount]);

  return {
    addToCart,
    changeCartQty,
    clearCart,
    clearPromo,
    applyPromo,
    spendGuestBonus,
    fetchBookingDetail,
    createBooking,
    createOrder,
    payOrder,
    submitOrderReview,
    registerPushDevice,
    refreshAvailableTables,
    saveProfile,
    toggleFavorite,
    loadMoreOrders,
    loadMoreNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  };
}
