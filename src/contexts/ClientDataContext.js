import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  cartKey,
} from './clientDataUtils';
import { patchUserScopeCache, writeJson } from './clientDataStorage';
import { useClientDataBootstrap } from './useClientDataBootstrap';
import { useClientDataActions } from './useClientDataActions';

const ClientDataContext = createContext();

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
  const [recommendedDishes, setRecommendedDishes] = useState([]);
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
  const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);

  useClientDataBootstrap({
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
  });

  const persistCart = useCallback(async (next) => {
    setCartItems(next);
    await writeJson(cartKey(userId), next);
  }, [userId]);

  const persistUserScope = useCallback(
    async (partial) => {
      if (!isAuthenticated) return;
      await patchUserScopeCache(userId, partial);
    },
    [userId, isAuthenticated],
  );

  const {
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
  } = useClientDataActions({
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
  });

  const value = useMemo(
    () => ({
      menu,
      recommendedDishes,
      tables,
      bookings,
      orders,
      cartItems,
      profile,
      favorites,
      notifications,
      notificationsUnreadCount,
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
      refreshAvailableTables,
      saveProfile,
      toggleFavorite,
      loadMoreOrders,
      loadMoreNotifications,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      menu, recommendedDishes, tables, bookings, orders, cartItems, profile, favorites, notifications, notificationsUnreadCount, isBootstrapping,
      ordersHasMore, notificationsHasMore, isLoadingMoreOrders, isLoadingMoreNotifications,
      appliedPromo, applyPromo, clearPromo, spendGuestBonus, fetchBookingDetail,
      addToCart, changeCartQty, clearCart, createBooking, createOrder, payOrder, submitOrderReview,
      registerPushDevice, refreshAvailableTables, saveProfile, toggleFavorite, loadMoreOrders, loadMoreNotifications,
      markNotificationRead, markAllNotificationsRead,
    ]
  );

  return <ClientDataContext.Provider value={value}>{children}</ClientDataContext.Provider>;
}
