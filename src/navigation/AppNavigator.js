import React, { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useClientData } from '../contexts/ClientDataContext';

// Screens
import AuthScreen from '../screens/AuthScreen';
import MenuScreen from '../screens/MenuScreen';
import DishDetailsScreen from '../screens/DishDetailsScreen';
import CartScreen from '../screens/CartScreen';
import BookingScreen from '../screens/BookingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import OrdersHistoryScreen from '../screens/OrdersHistoryScreen';
import BookingsHistoryScreen from '../screens/BookingsHistoryScreen';
import BookingDetailScreen from '../screens/BookingDetailScreen';
import BarScreen from '../screens/BarScreen';

// Navigation
import TabBar from '../components/TabBar';
import AppToast from '../components/AppToast';
import LoadingOverlay from '../components/LoadingOverlay';
import { CLIENT_APP_TITLE } from '../constants/venue';
import { useToastManager } from '../hooks/useToastManager';
import { useNetworkRecovery } from '../hooks/useNetworkRecovery';
import { useTabSwipeNavigation } from '../hooks/useTabSwipeNavigation';
import { useCheckoutFlow } from '../hooks/useCheckoutFlow';
import { getNativePushToken } from '../services/pushToken';

const TAB_ORDER = ['Menu', 'Bar', 'Cart', 'Booking', 'Profile'];
const NativeTabStack = createNativeStackNavigator();

export default function AppNavigator() {
  const screenWidth = Dimensions.get('window').width;
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoadingSession, user } = useAuth();
  const {
    menu,
    recommendedDishes,
    tables,
    bookings,
    cartItems,
    addToCart: addCartItem,
    changeCartQty,
    createBooking,
    createOrder,
    payOrder,
    submitOrderReview,
    orders,
    notifications,
    ordersHasMore,
    notificationsHasMore,
    isLoadingMoreOrders,
    isLoadingMoreNotifications,
    loadMoreOrders,
    loadMoreNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    profile,
    favorites,
    toggleFavorite,
    isBootstrapping,
    clearCart,
    appliedPromo,
    applyPromo,
    clearPromo,
    spendGuestBonus,
    fetchBookingDetail,
    registerPushDevice,
    refreshAvailableTables,
  } =
    useClientData();
  const colors = getColors(isDarkMode);
  const [currentScreen, setCurrentScreen] = useState('Menu');
  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [guestAuthOpen, setGuestAuthOpen] = useState(false);
  const [preorderContext, setPreorderContext] = useState(null);
  const wasAuthenticatedRef = useRef(false);
  const preorderActiveRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const registeredPushUserRef = useRef(null);
  const tabNavigationRef = useRef(null);
  const { toast, showRawToast } = useToastManager();
  const { showToast } = useNetworkRecovery(showRawToast);
  const {
    canSwipeTabs,
    navigateToScreen,
    leftEdgeSwipeResponder,
    rightEdgeSwipeResponder,
    transitionOverlayOpacity,
    transitionOverlayScale,
  } = useTabSwipeNavigation({
    screenWidth,
    tabOrder: TAB_ORDER,
    isAuthenticated,
    currentScreen,
    selectedDish,
    selectedBooking,
    setSelectedDish,
    setSelectedBooking,
    setCurrentScreen,
    tabNavigationRef,
  });
  const { paymentPrompt, onCheckout, onBookingSubmit, handlePayNow, handlePayLater } = useCheckoutFlow({
    cartItems,
    menuDishes: menu.dishes,
    createOrder,
    createBooking,
    clearCart,
    spendGuestBonus,
    payOrder,
    showToast,
    navigateToScreen,
  });

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const justSignedIn = isAuthenticated && !wasAuthenticatedRef.current;
    if (justSignedIn) {
      // Keep tabbar state aligned with the first authenticated screen.
      setCurrentScreen('Menu');
      setSelectedDish(null);
      setSelectedBooking(null);
      setGuestAuthOpen(false);
      setPreorderContext(null);
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  React.useEffect(() => {
    // Keep preorder context only inside booking flow (Booking -> Menu -> Cart -> dish details).
    if (!preorderContext) {
      preorderActiveRef.current = false;
      return;
    }
    const inPreorderFlow =
      currentScreen === 'Booking' ||
      currentScreen === 'Menu' ||
      currentScreen === 'Cart' ||
      Boolean(selectedDish);
    if (inPreorderFlow) {
      preorderActiveRef.current = true;
      return;
    }
    if (preorderActiveRef.current) {
      setPreorderContext(null);
      preorderActiveRef.current = false;
    }
  }, [currentScreen, selectedDish, preorderContext]);

  React.useEffect(() => {
    let cancelled = false;
    async function bindPushToken() {
      if (!isAuthenticated || !user?.id) {
        registeredPushUserRef.current = null;
        return;
      }
      if (registeredPushUserRef.current === user.id) return;
      const token = await getNativePushToken();
      if (!token || cancelled) return;
      try {
        await registerPushDevice({
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          deviceToken: token,
        });
        if (!cancelled) {
          registeredPushUserRef.current = user.id;
        }
      } catch {
        // no-op: push binding should not block UI
      }
    }
    bindPushToken();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, registerPushDevice]);

  const addToCart = (dishId, quantity, options = {}) => {
    addCartItem(dishId, quantity, options);
    navigateToScreen('Cart');
  };

  const changeQty = changeCartQty;

  const openNotificationTarget = React.useCallback((notification) => {
    if (notification?.id != null && notification.read !== true) {
      markNotificationRead(notification.id);
    }
    const targetScreen = String(notification?.targetScreen || '');
    if (targetScreen) {
      const allowed = new Set(['Menu', 'Bar', 'Cart', 'Booking', 'Profile', 'Notifications', 'Orders', 'Bookings']);
      if (allowed.has(targetScreen)) {
        navigateToScreen(targetScreen);
        return;
      }
    }
    const type = String(notification?.type || '').toLowerCase();
    if (['bonus_spent', 'bonus_earned', 'xp_earned', 'payment', 'review', 'push'].includes(type)) {
      navigateToScreen('Orders');
      return;
    }
    if (['booking_confirmed'].includes(type)) {
      navigateToScreen('Booking');
      return;
    }
    navigateToScreen('Profile');
  }, [markNotificationRead, navigateToScreen]);

  const renderTabScreen = React.useCallback((screen) => {
    switch (screen) {
      case 'Menu':
        return (
          <MenuScreen
            onOpenDish={setSelectedDish}
            dishes={menu.dishes}
            categories={menu.categories}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            preorderContext={preorderContext}
            recommendedDishes={recommendedDishes}
          />
        );
      case 'Cart':
        return (
          <CartScreen
            cartItems={cartItems}
            dishes={menu.dishes}
            onChangeQty={changeQty}
            onCheckout={onCheckout}
            onAddToCart={addCartItem}
            onValidationError={(message) => showToast('error', message)}
            onPromoMessage={(type, message) => showToast(type, message)}
            loyaltyPoints={profile?.loyaltyPoints || 0}
            guestDiscountPercentage={profile?.discountPercentage}
            appliedPromo={appliedPromo}
            onApplyPromo={applyPromo}
            onClearPromo={clearPromo}
          />
        );
      case 'Booking':
        return (
          <BookingScreen
            tables={tables}
            cartItems={cartItems}
            dishes={menu.dishes}
            onGoToMenuForPreorder={(ctx) => {
              setPreorderContext(ctx || null);
              navigateToScreen('Menu');
            }}
            onChangeCartQty={changeQty}
            onRequestAvailableTables={refreshAvailableTables}
            onSubmitBooking={onBookingSubmit}
          />
        );
      case 'Bar':
        return <BarScreen dishes={menu.dishes} onOpenDish={setSelectedDish} />;
      case 'Profile':
        return (
          <ProfileScreen
            onOpenNotifications={() => navigateToScreen('Notifications')}
            onOpenBookings={() => navigateToScreen('Bookings')}
            onOpenOrders={() => navigateToScreen('Orders')}
          />
        );
      default:
        return null;
    }
  }, [menu.dishes, menu.categories, favorites, toggleFavorite, cartItems, changeQty, onCheckout, addCartItem, profile?.loyaltyPoints, profile?.discountPercentage, appliedPromo, applyPromo, clearPromo, tables, preorderContext, navigateToScreen, refreshAvailableTables, onBookingSubmit, showToast]);

  const renderNativeTabs = React.useMemo(() => (
    <NavigationContainer
      independent
      ref={tabNavigationRef}
      onStateChange={() => {
        const route = tabNavigationRef.current?.getCurrentRoute?.();
        const name = String(route?.name || '');
        if (TAB_ORDER.includes(name) && name !== currentScreen) {
          setCurrentScreen(name);
        }
      }}
    >
      <NativeTabStack.Navigator
        initialRouteName="Menu"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 220,
          gestureEnabled: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {TAB_ORDER.map((screenName) => (
          <NativeTabStack.Screen key={screenName} name={screenName}>
            {() => renderTabScreen(screenName)}
          </NativeTabStack.Screen>
        ))}
      </NativeTabStack.Navigator>
    </NavigationContainer>
  ), [renderTabScreen, colors.background, currentScreen]);

  const overlayScreen = useMemo(() => {
    if (selectedBooking) {
      return (
        <BookingDetailScreen
          bookingId={selectedBooking.id}
          initial={selectedBooking}
          onBack={() => setSelectedBooking(null)}
          fetchBookingDetail={fetchBookingDetail}
        />
      );
    }

    if (selectedDish) {
      return (
        <DishDetailsScreen
          dish={selectedDish}
          dishes={menu.dishes}
          onBack={() => setSelectedDish(null)}
          onAddToCart={addToCart}
          canOrder={isAuthenticated}
          onOpenAuth={() => {
            setSelectedDish(null);
            setGuestAuthOpen(true);
          }}
        />
      );
    }

    if (currentScreen === 'Notifications') {
      return (
        <NotificationsScreen
          notifications={notifications}
          onBack={() => navigateToScreen('Profile')}
          onOpenNotification={openNotificationTarget}
          onMarkAllRead={markAllNotificationsRead}
          hasMore={notificationsHasMore}
          isLoadingMore={isLoadingMoreNotifications}
          onLoadMore={loadMoreNotifications}
        />
      );
    }

    if (currentScreen === 'Orders') {
      return (
        <OrdersHistoryScreen
          orders={orders}
          onBack={() => navigateToScreen('Profile')}
          onPayOrder={payOrder}
          onSubmitReview={submitOrderReview}
          onActionError={(message) => showToast('error', message)}
          hasMore={ordersHasMore}
          isLoadingMore={isLoadingMoreOrders}
          onLoadMore={loadMoreOrders}
        />
      );
    }

    if (currentScreen === 'Bookings') {
      return (
        <BookingsHistoryScreen
          bookings={bookings}
          onBack={() => navigateToScreen('Profile')}
          onOpenBooking={(b) => {
            setSelectedDish(null);
            setSelectedBooking(b);
          }}
        />
      );
    }

    return null;
  }, [
    selectedBooking, fetchBookingDetail, selectedDish, menu.dishes, addToCart, isAuthenticated,
    currentScreen, notifications, openNotificationTarget, markAllNotificationsRead, notificationsHasMore,
    isLoadingMoreNotifications, loadMoreNotifications, orders, payOrder,
    submitOrderReview, ordersHasMore, isLoadingMoreOrders, loadMoreOrders,
    bookings, navigateToScreen, showToast,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.screenTransition}>
        {isLoadingSession ? null : isAuthenticated ? (
          renderNativeTabs
        ) : guestAuthOpen ? (
          <AuthScreen onBackToMenu={() => setGuestAuthOpen(false)} />
        ) : (
          <MenuScreen
            onOpenDish={setSelectedDish}
            dishes={menu.dishes}
            categories={menu.categories}
            favorites={[]}
            onToggleFavorite={() => {}}
            recommendedDishes={recommendedDishes}
            canUseFavorites={false}
          />
        )}
        {(isAuthenticated || Boolean(selectedDish)) && overlayScreen ? (
          <View style={[styles.overlayScreen, { backgroundColor: colors.background }]}>
            {overlayScreen}
          </View>
        ) : null}
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.transitionOverlay,
          {
            backgroundColor: colors.background,
            opacity: transitionOverlayOpacity,
            transform: [{ scale: transitionOverlayScale }],
          },
        ]}
      />
      {canSwipeTabs ? <View {...leftEdgeSwipeResponder.panHandlers} style={styles.leftEdgeSwipeZone} /> : null}
      {canSwipeTabs ? <View {...rightEdgeSwipeResponder.panHandlers} style={styles.rightEdgeSwipeZone} /> : null}
      <AppToast visible={toast.visible} type={toast.type} message={toast.message} />
      <Modal transparent visible={paymentPrompt.visible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Оплата заказа</Text>
            <Text style={[styles.modalText, { color: colors.textLight }]}>
              Заказ успешно создан. Выполнить оплату сейчас?
            </Text>
            {paymentPrompt.summary?.finalTotal != null && Number(paymentPrompt.summary.finalTotal) > 0 ? (
              <View style={{ marginBottom: 12, gap: 4 }}>
                <Text style={[styles.modalText, { color: colors.text }]}>
                  К оплате по чеку: {Number(paymentPrompt.summary.finalTotal).toFixed(2)} руб.
                </Text>
                {paymentPrompt.summary.grossTotal != null &&
                Number(paymentPrompt.summary.grossTotal) !== Number(paymentPrompt.summary.finalTotal) ? (
                  <Text style={[styles.modalFinePrint, { color: colors.textMuted }]}>
                    До скидок: {Number(paymentPrompt.summary.grossTotal).toFixed(2)} руб.
                    {Array.isArray(paymentPrompt.summary.discounts) && paymentPrompt.summary.discounts.length
                      ? ` • скидки: ${paymentPrompt.summary.discounts.map((d) => d?.name || 'скидка').join(', ')}`
                      : ''}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary, borderColor: colors.border }]}
              onPress={handlePayNow}
            >
              <Text style={[styles.modalPrimaryText, { color: colors.black }]}>Оплатить сейчас</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalSecondaryBtn, { borderColor: colors.border }]} onPress={handlePayLater}>
              <Text style={[styles.modalSecondaryText, { color: colors.text }]}>Позже</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {isAuthenticated &&
      !selectedDish &&
      !selectedBooking &&
      !['Notifications', 'Orders', 'Bookings'].includes(currentScreen) ? (
        <TabBar
          currentScreen={currentScreen}
          onNavigate={(screen) => navigateToScreen(screen)}
          cartItems={cartItems}
        />
      ) : null}
      {!isAuthenticated && !isLoadingSession && !guestAuthOpen ? (
        <TouchableOpacity
          style={[
            styles.guestAuthCta,
            {
              bottom: Math.max(insets.bottom, 12) + 12,
              backgroundColor: colors.primary,
              borderColor: colors.hairline,
            },
          ]}
          onPress={() => setGuestAuthOpen(true)}
          activeOpacity={0.9}
        >
          <Text style={[styles.guestAuthCtaText, { color: colors.black }]}>Войти / Регистрация</Text>
        </TouchableOpacity>
      ) : null}
      <LoadingOverlay visible={isLoading || isLoadingSession || isBootstrapping} title={CLIENT_APP_TITLE} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenTransition: {
    flex: 1,
  },
  overlayScreen: {
    ...StyleSheet.absoluteFillObject,
  },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  leftEdgeSwipeZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 26,
    backgroundColor: 'transparent',
  },
  rightEdgeSwipeZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 26,
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    marginBottom: 14,
  },
  modalFinePrint: {
    fontSize: 12,
    lineHeight: 16,
  },
  modalPrimaryBtn: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginBottom: 8,
  },
  modalPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  guestAuthCta: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestAuthCtaText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

