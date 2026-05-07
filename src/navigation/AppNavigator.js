import React, { useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Animated, Dimensions, Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import DeliveriesHistoryScreen from '../screens/DeliveriesHistoryScreen';
import BarScreen from '../screens/BarScreen';

// Navigation
import TabBar from '../components/TabBar';
import AppToast from '../components/AppToast';
import LoadingOverlay from '../components/LoadingOverlay';
import WaiterCallModal from '../components/WaiterCallModal';
import { calculateCartTotal } from '../utils/cart';
import { runtimeConfig } from '../config/runtimeConfig';
import { CLIENT_APP_TITLE } from '../constants/venue';

const TAB_ORDER = ['Menu', 'Bar', 'Cart', 'Booking', 'Profile'];
const NativeTabStack = createNativeStackNavigator();

export default function AppNavigator() {
  const screenWidth = Dimensions.get('window').width;
  const { isDarkMode } = useTheme();
  const { isAuthenticated, isLoadingSession, user } = useAuth();
  const {
    menu,
    tables,
    bookings,
    cartItems,
    addToCart: addCartItem,
    changeCartQty,
    createBooking,
    createOrder,
    payOrder,
    submitOrderReview,
    registerPushDevice,
    sendTestPush,
    requestWaiterCall,
    orders,
    notifications,
    ordersHasMore,
    notificationsHasMore,
    isLoadingMoreOrders,
    isLoadingMoreNotifications,
    loadMoreOrders,
    loadMoreNotifications,
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
  } =
    useClientData();
  const colors = getColors(isDarkMode);
  const [currentScreen, setCurrentScreen] = useState('Menu');
  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [checkoutOptions, setCheckoutOptions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });
  const [paymentPrompt, setPaymentPrompt] = useState({ visible: false, orderId: null });
  const [waiterModalVisible, setWaiterModalVisible] = useState(false);
  const [tabTransitionAnimation, setTabTransitionAnimation] = useState('slide_from_right');
  const registeredPushUserRef = useRef(null);
  const tabNavigationRef = useRef(null);
  const transitionOverlayOpacity = useRef(new Animated.Value(0)).current;
  const transitionOverlayScale = useRef(new Animated.Value(1.02)).current;
  const currentScreenRef = useRef(currentScreen);
  const canSwipeTabs = isAuthenticated && !selectedDish && !selectedBooking && TAB_ORDER.includes(currentScreen);
  const canSwipeTabsRef = useRef(canSwipeTabs);

  React.useEffect(() => {
    currentScreenRef.current = currentScreen;
    canSwipeTabsRef.current = canSwipeTabs;
  }, [currentScreen, canSwipeTabs]);

  React.useEffect(() => {
    if (!TAB_ORDER.includes(currentScreen)) return;
    requestAnimationFrame(() => {
      tabNavigationRef.current?.navigate(currentScreen);
    });
  }, [currentScreen]);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    async function bindPushDevice() {
      if (!isAuthenticated || !user?.id) return;
      if (registeredPushUserRef.current === user.id) return;
      try {
        await registerPushDevice({
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          deviceToken: `demo-token-${Platform.OS}-${user.id}`,
          deviceName: Platform.OS === 'ios' ? 'iPhone' : 'Android',
          appVersion: '1.0.0',
        });
        registeredPushUserRef.current = user.id;
      } catch {
        // non-blocking for demo mode
      }
    }
    bindPushDevice();
  }, [isAuthenticated, user?.id, registerPushDevice]);

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2600);
  };

  const submitWaiterFromModal = React.useCallback(
    async (payload) => {
      try {
        await requestWaiterCall(payload);
        showToast('success', 'Запрос официанту отправлен');
        setWaiterModalVisible(false);
      } catch (error) {
        showToast('error', error?.message || 'Не удалось отправить запрос официанту. Попробуйте еще раз.');
      }
    },
    [requestWaiterCall]
  );

  const navigateToScreen = React.useCallback((screen, direction = 'left') => {
    const fromScreen = currentScreenRef.current;
    const canUseTabTransition = TAB_ORDER.includes(fromScreen) && TAB_ORDER.includes(screen) && !selectedDish && !selectedBooking;
    if (canUseTabTransition && fromScreen !== screen) {
      const fromIndex = TAB_ORDER.indexOf(fromScreen);
      const toIndex = TAB_ORDER.indexOf(screen);
      const isForward = toIndex > fromIndex;
      transitionOverlayOpacity.stopAnimation();
      transitionOverlayScale.stopAnimation();
      transitionOverlayOpacity.setValue(0);
      transitionOverlayScale.setValue(1.02);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(transitionOverlayOpacity, {
            toValue: 0.092,
            duration: 130,
            useNativeDriver: true,
          }),
          Animated.timing(transitionOverlayOpacity, {
            toValue: 0,
            duration: 320,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(transitionOverlayScale, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();
      setTabTransitionAnimation(
        isForward ? 'slide_from_right' : 'slide_from_left'
      );
      setSelectedDish(null);
      setSelectedBooking(null);
      setCurrentScreen(screen);
      requestAnimationFrame(() => {
        tabNavigationRef.current?.navigate(screen);
      });
      return;
    }
    setSelectedDish(null);
    setSelectedBooking(null);
    setCurrentScreen(screen);
  }, [selectedDish, selectedBooking, transitionOverlayOpacity, transitionOverlayScale]);

  const navigateAdjacentTab = React.useCallback(
    (delta) => {
      const idx = TAB_ORDER.indexOf(currentScreenRef.current);
      if (idx < 0) return;
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= TAB_ORDER.length) return;
      const nextScreen = TAB_ORDER[nextIdx];
      navigateToScreen(nextScreen, delta > 0 ? 'left' : 'right');
    },
    [navigateToScreen]
  );

  const leftEdgeSwipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (_, gestureState) => {
        if (!canSwipeTabsRef.current) return false;
        return gestureState.x0 <= 86;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!canSwipeTabsRef.current) return false;
        const { dx, dy, x0 } = gestureState;
        const fromEdge = x0 <= 86;
        const allowWideSwipe = currentScreenRef.current !== 'Menu';
        if (!fromEdge && !allowWideSwipe) return false;
        return dx < -10 && Math.abs(dx) > Math.abs(dy) * 1.06;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!canSwipeTabsRef.current) return;
        const { dx, vx } = gestureState;
        if (dx < -34 || vx < -0.34) {
          navigateAdjacentTab(1);
        }
      },
      onPanResponderTerminate: () => {},
    })
  ).current;

  const rightEdgeSwipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (_, gestureState) => {
        if (!canSwipeTabsRef.current) return false;
        return gestureState.x0 >= screenWidth - 86;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!canSwipeTabsRef.current) return false;
        const { dx, dy, x0 } = gestureState;
        const fromEdge = x0 >= screenWidth - 86;
        const allowWideSwipe = currentScreenRef.current !== 'Menu';
        if (!fromEdge && !allowWideSwipe) return false;
        return dx > 10 && Math.abs(dx) > Math.abs(dy) * 1.06;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!canSwipeTabsRef.current) return;
        const { dx, vx } = gestureState;
        if (dx > 34 || vx > 0.34) {
          navigateAdjacentTab(-1);
        }
      },
      onPanResponderTerminate: () => {},
    })
  ).current;

  const addToCart = (dishId, quantity) => {
    addCartItem(dishId, quantity);
    navigateToScreen('Cart', 'left');
  };

  const changeQty = changeCartQty;

  const openNotificationTarget = React.useCallback((notification) => {
    const targetScreen = String(notification?.targetScreen || '');
    if (targetScreen) {
      const allowed = new Set(['Menu', 'Bar', 'Cart', 'Booking', 'Profile', 'Notifications', 'Orders', 'Bookings', 'Deliveries']);
      if (allowed.has(targetScreen)) {
        navigateToScreen(targetScreen, 'left');
        return;
      }
    }
    const type = String(notification?.type || '').toLowerCase();
    if (['bonus_spent', 'bonus_earned', 'xp_earned', 'payment', 'review', 'push'].includes(type)) {
      navigateToScreen('Orders', 'left');
      return;
    }
    if (['booking_confirmed'].includes(type)) {
      navigateToScreen('Booking', 'left');
      return;
    }
    navigateToScreen('Profile', 'left');
  }, [navigateToScreen]);

  const onCheckout = async (options = {}) => {
    setCheckoutOptions(options);
    if (options.orderType === 'booking') {
      navigateToScreen('Booking', 'left');
      return;
    }

    const total = calculateCartTotal(cartItems, menu.dishes);
    const detailedItems = cartItems.map((item) => {
      const dish = menu.dishes.find((value) => value.id === item.id);
      return {
        id: item.id,
        title: dish?.title || item.id,
        unitPrice: dish?.price || 0,
        quantity: item.quantity,
      };
    });
    try {
      const createdOrder = await createOrder({
        items: detailedItems,
        total,
        orderType: options.orderType,
        useLoyaltyPoints: Boolean(options.useLoyaltyPoints),
        pointsToSpend: Number(options.pointsToSpend || 0),
        deliveryDetails: options.deliveryDetails || null,
        bookingDraft: {
          address: options.orderType === 'delivery' ? options.deliveryAddress : options.pickupAddress || '',
        },
        appliedPromo: options.appliedPromo || null,
        promoDiscountRub: options.promoDiscountRub ?? 0,
      });
      if (
        runtimeConfig.integratedBackend === 'syncflow' &&
        options.useLoyaltyPoints &&
        Number(options.pointsToSpend || 0) > 0 &&
        createdOrder?.id != null &&
        Number.isFinite(Number(createdOrder.id))
      ) {
        try {
          await spendGuestBonus({
            amount: Number(options.pointsToSpend),
            orderId: Number(createdOrder.id),
          });
        } catch (e) {
          showToast(
            'error',
            e?.message || 'Заказ создан, но бонусы не удалось списать. Попробуйте позже или обратитесь в ресторан.'
          );
        }
      }
      await clearCart();
      navigateToScreen('Profile', 'left');
      if (createdOrder?.paymentStatus === 'pending' || createdOrder?.status === 'created') {
        setPaymentPrompt({ visible: true, orderId: createdOrder.id });
      } else {
        showToast('success', 'Заказ успешно оформлен.');
      }
    } catch (error) {
      showToast('error', error?.message || 'Не удалось оформить заказ. Проверьте данные и повторите попытку.');
    }
  };

  const onBookingSubmit = async (payload) => {
    try {
      const total = calculateCartTotal(cartItems, menu.dishes);
      const detailedItems = cartItems.map((item) => {
        const dish = menu.dishes.find((value) => value.id === item.id);
        return {
          id: item.id,
          title: dish?.title || item.id,
          unitPrice: dish?.price || 0,
          quantity: item.quantity,
        };
      });
      const booking = await createBooking({
        ...payload,
        preorderItems: detailedItems.length ? detailedItems : undefined,
      });
      if (!detailedItems.length) {
        navigateToScreen('Profile', 'left');
        showToast('success', 'Бронирование успешно оформлено.');
        return true;
      }
      if (runtimeConfig.integratedBackend === 'syncflow') {
        await clearCart();
        navigateToScreen('Profile', 'left');
        showToast(
          'success',
          'Бронирование создано. Список блюд из корзины покажите официанту при визите — заказ оформят в зале.'
        );
        return true;
      }
      const serveAt = `${payload?.date || ''} ${payload?.servingTime || payload?.time || ''}`.trim();
      const createdOrder = await createOrder({
        items: detailedItems,
        total,
        orderType: checkoutOptions?.orderType || 'booking',
        useLoyaltyPoints: Boolean(checkoutOptions?.useLoyaltyPoints),
        pointsToSpend: Number(checkoutOptions?.pointsToSpend || 0),
        bookingId: booking?.id || null,
        scheduledAt: serveAt,
        bookingDraft: payload,
      });
      await clearCart();
      navigateToScreen('Profile', 'left');
      if (createdOrder?.paymentStatus === 'pending' || createdOrder?.status === 'created') {
        setPaymentPrompt({ visible: true, orderId: createdOrder.id });
      } else {
        showToast('success', 'Бронирование и заказ успешно оформлены.');
      }
      return true;
    } catch (error) {
      showToast('error', error?.message || 'Не удалось завершить оформление. Попробуйте снова.');
      return false;
    }
  };

  const handlePayNow = async () => {
    if (!paymentPrompt.orderId) return;
    try {
      await payOrder(paymentPrompt.orderId);
      setPaymentPrompt({ visible: false, orderId: null });
      navigateToScreen('Orders', 'left');
      showToast('success', 'Оплата прошла успешно.');
    } catch (error) {
      showToast('error', error?.message || 'Не удалось провести оплату. Повторите попытку.');
    }
  };

  const handlePayLater = () => {
    setPaymentPrompt({ visible: false, orderId: null });
    navigateToScreen('Orders', 'left');
    showToast('success', 'Статус заказа: ожидание оплаты. Оплатить можно в истории заказов.');
  };

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
            onOpenWaiterCall={() => setWaiterModalVisible(true)}
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
            onGoToMenuForPreorder={() => navigateToScreen('Menu', 'right')}
            onChangeCartQty={changeQty}
            onSubmitBooking={onBookingSubmit}
          />
        );
      case 'Bar':
        return <BarScreen dishes={menu.dishes} onOpenDish={setSelectedDish} />;
      case 'Profile':
        return (
          <ProfileScreen
            onOpenNotifications={() => navigateToScreen('Notifications', 'left')}
            onOpenBookings={() => navigateToScreen('Bookings', 'left')}
            onOpenOrders={() => navigateToScreen('Orders', 'left')}
            onOpenDeliveries={() => navigateToScreen('Deliveries', 'left')}
            onSendTestPush={async () => {
              try {
                await sendTestPush({
                  title: 'Push: статус сервиса',
                  body: 'Тестовое push-уведомление успешно доставлено.',
                  targetScreen: 'Orders',
                });
                showToast('success', 'Push-уведомление отправлено');
              } catch (error) {
                showToast('error', error?.message || 'Не удалось отправить push-уведомление.');
              }
            }}
          />
        );
      default:
        return null;
    }
  }, [menu.dishes, menu.categories, favorites, toggleFavorite, cartItems, changeQty, onCheckout, addCartItem, profile?.loyaltyPoints, appliedPromo, applyPromo, clearPromo, tables, navigateToScreen, onBookingSubmit, sendTestPush]);

  const renderNativeTabs = React.useMemo(() => (
    <NavigationContainer independent ref={tabNavigationRef}>
      <NativeTabStack.Navigator
        initialRouteName="Menu"
        screenOptions={{
          headerShown: false,
          animation: tabTransitionAnimation,
          animationDuration: 360,
          gestureEnabled: false,
        }}
      >
        {TAB_ORDER.map((screenName) => (
          <NativeTabStack.Screen key={screenName} name={screenName}>
            {() => renderTabScreen(screenName)}
          </NativeTabStack.Screen>
        ))}
      </NativeTabStack.Navigator>
    </NavigationContainer>
  ), [renderTabScreen, tabTransitionAnimation]);

  const renderScreen = useMemo(() => {
    if (isLoadingSession) {
      return null;
    }

    if (!isAuthenticated) {
      return <AuthScreen />;
    }

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
        />
      );
    }
    switch (currentScreen) {
      case 'Menu':
      case 'Bar':
      case 'Cart':
      case 'Booking':
      case 'Profile':
        return renderNativeTabs;
      case 'Notifications':
        return (
          <NotificationsScreen
            notifications={notifications}
            onBack={() => navigateToScreen('Profile', 'right')}
            onOpenNotification={openNotificationTarget}
            hasMore={notificationsHasMore}
            isLoadingMore={isLoadingMoreNotifications}
            onLoadMore={loadMoreNotifications}
          />
        );
      case 'Orders':
        return (
          <OrdersHistoryScreen
            orders={orders}
            onBack={() => navigateToScreen('Profile', 'right')}
            onPayOrder={payOrder}
            onSubmitReview={submitOrderReview}
            onActionError={(message) => showToast('error', message)}
            hasMore={ordersHasMore}
            isLoadingMore={isLoadingMoreOrders}
            onLoadMore={loadMoreOrders}
          />
        );
      case 'Deliveries':
        return (
          <DeliveriesHistoryScreen
            deliveries={(orders || []).filter((item) => String(item.orderType || '') === 'delivery')}
            onBack={() => navigateToScreen('Profile', 'right')}
          />
        );
      case 'Bookings':
        return (
          <BookingsHistoryScreen
            bookings={bookings}
            onBack={() => navigateToScreen('Profile', 'right')}
            onOpenBooking={(b) => {
              setSelectedDish(null);
              setSelectedBooking(b);
            }}
          />
        );
      default:
        return renderTabScreen('Menu');
    }
  }, [
    currentScreen, selectedDish, selectedBooking, cartItems, isAuthenticated, isLoadingSession, menu, tables, bookings, favorites, profile,
    notifications, orders, checkoutOptions, openNotificationTarget, fetchBookingDetail, renderTabScreen, renderNativeTabs,
    appliedPromo, applyPromo, clearPromo, spendGuestBonus, createOrder,
    notificationsHasMore, isLoadingMoreNotifications, loadMoreNotifications,
    ordersHasMore, isLoadingMoreOrders, loadMoreOrders, navigateToScreen,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.screenTransition}>
        {renderScreen}
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
      <WaiterCallModal
        visible={waiterModalVisible}
        onClose={() => setWaiterModalVisible(false)}
        tables={tables}
        onSubmit={submitWaiterFromModal}
      />
      {isAuthenticated &&
      !selectedDish &&
      !selectedBooking &&
      !['Notifications', 'Orders', 'Bookings', 'Deliveries'].includes(currentScreen) ? (
        <TabBar
          currentScreen={currentScreen}
          onNavigate={(screen) => navigateToScreen(screen, 'left')}
          cartItems={cartItems}
        />
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
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  leftEdgeSwipeZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 86,
    backgroundColor: 'transparent',
  },
  rightEdgeSwipeZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 86,
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
});

