import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookingTables, dishes, menuCategories } from '../../data/menu';

const LOYALTY_CONVERSION_RATE = 1; // 1 point = 1 RUB
const MAX_DISCOUNT_SHARE = 0.5;
const PROFILE_COMPLETION_BONUS = 150;
const PROFILE_COMPLETION_XP = 50;

function bookingsKey(userId) {
  return `client_bookings_${userId || 'guest'}`;
}
function ordersKey(userId) {
  return `client_orders_${userId || 'guest'}`;
}
function profileKey(userId) {
  return `client_profile_${userId || 'guest'}`;
}
function favoritesKey(userId) {
  return `client_favorites_${userId || 'guest'}`;
}
function notificationsKey(userId) {
  return `client_notifications_${userId || 'guest'}`;
}

async function readBookings(userId) {
  const raw = await AsyncStorage.getItem(bookingsKey(userId));
  return raw ? JSON.parse(raw) : [];
}

async function writeBookings(userId, bookings) {
  await AsyncStorage.setItem(bookingsKey(userId), JSON.stringify(bookings));
}
async function readOrders(userId) {
  const raw = await AsyncStorage.getItem(ordersKey(userId));
  return raw ? JSON.parse(raw) : [];
}
async function writeOrders(userId, orders) {
  await AsyncStorage.setItem(ordersKey(userId), JSON.stringify(orders));
}
async function readNotifications(userId) {
  const raw = await AsyncStorage.getItem(notificationsKey(userId));
  return raw ? JSON.parse(raw) : [];
}
async function writeNotifications(userId, notifications) {
  await AsyncStorage.setItem(notificationsKey(userId), JSON.stringify(notifications));
}

export async function fetchMenu() {
  return {
    categories: ['Все', ...menuCategories],
    dishes,
  };
}

export async function fetchTables() {
  return bookingTables;
}

export async function createBooking(payload, userId) {
  const existing = await readBookings(userId);
  const preorder =
    Array.isArray(payload.preorderItems) && payload.preorderItems.length
      ? {
          items: payload.preorderItems,
          servingTime: String(payload.servingTime || payload.time || '').slice(0, 5),
          bookingTime: String(payload.time || '').slice(0, 5),
        }
      : null;
  const booking = {
    id: `booking-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'confirmed',
    people: payload.people,
    date: payload.date,
    time: payload.time,
    address: payload.address,
    tableId: payload.tableId,
    preorder,
  };
  const next = [booking, ...existing];
  await writeBookings(userId, next);
  const notifications = await readNotifications(userId);
  const preorderHint = preorder ? ` Предзаказ (${preorder.items.length} поз.) сохранён.` : '';
  await writeNotifications(userId, [
    {
      id: `n-${Date.now()}-booking-reminder`,
      type: 'push',
      title: 'Напоминание о бронировании',
      text: `Напоминание: у вас бронь по адресу ${payload.address || 'указанный адрес'} через 1 час.`,
      targetScreen: 'Bookings',
      targetId: booking.id,
      createdAt: new Date().toISOString(),
    },
    {
      id: `n-${Date.now()}`,
      type: 'booking_confirmed',
      title: 'Бронирование подтверждено',
      text: `Стол забронирован на ${payload.date} ${payload.time}.${preorderHint}`,
      createdAt: new Date().toISOString(),
    },
    ...notifications,
  ]);
  return booking;
}

export async function fetchBookings(userId) {
  return readBookings(userId);
}

export async function fetchOrders(userId, options = {}) {
  const all = await readOrders(userId);
  const limit = Math.max(1, Math.min(100, Math.floor(Number(options?.limit ?? 30))));
  const offset = Math.max(0, Math.floor(Number(options?.offset ?? 0)));
  return all.slice(offset, offset + limit);
}

export async function createOrder(payload, userId) {
  const existing = await readOrders(userId);
  const profile = await fetchUserProfile(userId);
  const availablePoints = Math.max(0, Number(profile.loyaltyPoints || 0));
  const subtotal = Number(payload.total || 0);
  const requestedPoints = payload?.useLoyaltyPoints ? Number(payload.pointsToSpend || 0) : 0;
  const maxDiscountRub = subtotal * MAX_DISCOUNT_SHARE;
  const maxSpendByTotal = Math.floor(maxDiscountRub * LOYALTY_CONVERSION_RATE);
  if (payload?.useLoyaltyPoints && requestedPoints > availablePoints) {
    throw new Error(`Недостаточно баллов: доступно ${availablePoints}, запрошено ${Math.floor(requestedPoints)}.`);
  }
  if (payload?.useLoyaltyPoints && requestedPoints > maxSpendByTotal) {
    throw new Error(`Можно списать максимум ${maxSpendByTotal} баллов (до 50% суммы заказа).`);
  }
  const pointsSpent = Math.max(0, Math.min(availablePoints, maxSpendByTotal, Math.floor(requestedPoints)));
  const discount = Number((pointsSpent / LOYALTY_CONVERSION_RATE).toFixed(2));
  const payableTotal = Math.max(0, Number((subtotal - discount).toFixed(2)));
  const xpEarned = 0;
  const bonusEarned = 0;
  const order = {
    ...payload,
    id: `order-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'created',
    orderType: payload.orderType || 'booking',
    deliveryDetails: payload?.deliveryDetails || null,
    deliveryStatus: payload?.orderType === 'delivery' ? 'created' : '',
    subtotal,
    discount,
    bonusSpent: pointsSpent,
    bonusEarned,
    xpEarned,
    total: payableTotal,
    paymentStatus: 'pending',
    scheduledAt: String(payload?.scheduledAt || ''),
    bookingId: payload?.bookingId || null,
    reviewed: false,
  };
  const next = [order, ...existing];
  await writeOrders(userId, next);

  await AsyncStorage.setItem(
    profileKey(userId),
    JSON.stringify({
      ...profile,
      loyaltyPoints: availablePoints - pointsSpent,
      xpPoints: Number(profile.xpPoints || 0),
    })
  );
  const notifications = await readNotifications(userId);
  const nextNotifications = [...notifications];
  if (pointsSpent > 0) {
    nextNotifications.unshift({
      id: `n-${Date.now()}-spent`,
      type: 'bonus_spent',
      title: 'Бонусы списаны',
      text: `Заказ на ${subtotal} руб.: списано ${pointsSpent} баллов, скидка ${discount} руб.`,
      createdAt: new Date().toISOString(),
    });
  }
  nextNotifications.unshift({
    id: `n-${Date.now()}-awaiting-payment`,
    type: 'order_status',
    title: 'Ожидание оплаты',
    text: 'Заказ создан и ожидает оплаты. Начисление бонусов будет выполнено после оплаты.',
    createdAt: new Date().toISOString(),
  });
  if (order.orderType === 'delivery') {
    nextNotifications.unshift({
      id: `n-${Date.now()}-delivery-created`,
      type: 'push',
      title: 'Доставка: создано',
      text: 'Заказ доставки создан.',
      targetScreen: 'Deliveries',
      targetId: order.id,
      createdAt: new Date().toISOString(),
    });
  }
  await writeNotifications(userId, nextNotifications);
  return order;
}

export async function payOrder(orderId, userId) {
  const profile = await fetchUserProfile(userId);
  const existing = await readOrders(userId);
  let earned = 0;
  let xp = 0;
  const next = existing.map((order) => {
    const isTarget = order.id === orderId || order.id === `order-${String(orderId).replace(/^order-/, '')}`;
    if (!isTarget) return order;
    if (order.paymentStatus === 'paid' || order.status === 'confirmed') return order;
    const total = Number(order.total || 0);
    const spent = Number(order.bonusSpent || 0);
    earned = spent > 0 ? 0 : Math.round(total * 0.05);
    xp = Math.round(total * 0.05);
    return { ...order, paymentStatus: 'paid', status: 'confirmed', bonusEarned: earned, xpEarned: xp };
  });
  await writeOrders(userId, next);
  await AsyncStorage.setItem(
    profileKey(userId),
    JSON.stringify({
      ...profile,
      loyaltyPoints: Number(profile.loyaltyPoints || 0) + earned,
      xpPoints: Number(profile.xpPoints || 0) + xp,
    })
  );
  const notifications = await readNotifications(userId);
  const nextNotifications = [
    {
      id: `n-${Date.now()}-payment`,
      type: 'payment',
      title: 'Оплата выполнена',
      text: `Заказ ${orderId} успешно оплачен.`,
      createdAt: new Date().toISOString(),
    },
    ...notifications,
  ];
  if (earned > 0) {
    nextNotifications.unshift({
      id: `n-${Date.now()}-bonus-earned-after-pay`,
      type: 'bonus_earned',
      title: 'Начислены бонусы за оплату',
      text: `+${earned} бонусов начислено после оплаты заказа.`,
      createdAt: new Date().toISOString(),
    });
  }
  const paidOrder = next.find((order) => order.id === orderId || order.id === `order-${String(orderId).replace(/^order-/, '')}`);
  if (paidOrder?.orderType === 'delivery') {
    nextNotifications.unshift(
      {
        id: `n-${Date.now()}-delivery-preparing`,
        type: 'push',
        title: 'Доставка: готовится',
        text: 'Заказ готовится к отправке.',
        targetScreen: 'Deliveries',
        targetId: paidOrder.id,
        createdAt: new Date().toISOString(),
      },
      {
        id: `n-${Date.now()}-delivery-onway`,
        type: 'push',
        title: 'Доставка: в пути',
        text: 'Курьер в пути.',
        targetScreen: 'Deliveries',
        targetId: paidOrder.id,
        createdAt: new Date().toISOString(),
      },
      {
        id: `n-${Date.now()}-delivery-eta`,
        type: 'push',
        title: 'Доставка: осталось 15 минут',
        text: 'Осталось примерно 15 минут до доставки.',
        targetScreen: 'Deliveries',
        targetId: paidOrder.id,
        createdAt: new Date().toISOString(),
      },
      {
        id: `n-${Date.now()}-delivery-arrived`,
        type: 'push',
        title: 'Доставка: заказ у вас',
        text: paidOrder?.deliveryDetails?.leaveAtDoor ? 'Заказ оставлен у двери.' : 'Курьер прибыл с заказом.',
        targetScreen: 'Deliveries',
        targetId: paidOrder.id,
        createdAt: new Date().toISOString(),
      }
    );
  }
  await writeNotifications(userId, nextNotifications);
  return next.find((order) => order.id === orderId) || { id: orderId, paymentStatus: 'paid', status: 'confirmed' };
}

export async function submitOrderReview(orderId, payload, userId) {
  const existing = await readOrders(userId);
  const targetOrder = existing.find(
    (order) => order.id === orderId || order.id === `order-${String(orderId).replace(/^order-/, '')}`
  );
  if (!targetOrder) {
    throw new Error('Заказ не найден.');
  }
  if (!['paid', 'confirmed', 'completed'].includes(String(targetOrder.paymentStatus || targetOrder.status || ''))) {
    throw new Error('Отзыв можно оставить только после оплаты заказа.');
  }
  if (targetOrder.reviewed) {
    throw new Error('Отзыв по этому заказу уже отправлен.');
  }
  const next = existing.map((order) =>
    order.id === orderId || order.id === `order-${String(orderId).replace(/^order-/, '')}`
      ? {
          ...order,
          reviewed: true,
          review: {
            rating: Math.max(1, Math.min(5, Number(payload?.rating || 5))),
            comment: String(payload?.comment || ''),
            createdAt: new Date().toISOString(),
          },
        }
      : order
  );
  await writeOrders(userId, next);
  const notifications = await readNotifications(userId);
  await writeNotifications(userId, [
    {
      id: `n-${Date.now()}-review`,
      type: 'review',
      title: 'Спасибо за отзыв',
      text: `Оценка ${Math.max(1, Math.min(5, Number(payload?.rating || 5)))}/5 сохранена.`,
      createdAt: new Date().toISOString(),
    },
    ...notifications,
  ]);
  return { ok: true, orderId };
}

export async function fetchUserProfile(userId) {
  const raw = await AsyncStorage.getItem(profileKey(userId));
  if (raw) {
    return JSON.parse(raw);
  }
  const profile = {
    role: 'Гость',
    loyaltyPoints: 0,
    xpPoints: 0,
    firstName: '',
    lastName: '',
    birthDate: '',
    avatarUrl: '',
    login: '',
  };
  await AsyncStorage.setItem(profileKey(userId), JSON.stringify(profile));
  return profile;
}

export async function updateUserProfile(userId, patch) {
  const current = await fetchUserProfile(userId);
  const wasComplete = Boolean(current.firstName && current.lastName && current.birthDate && current.login);
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(profileKey(userId), JSON.stringify(next));
  const isComplete = Boolean(next.firstName && next.lastName && next.birthDate && next.login);
  if (!wasComplete && isComplete) {
    const updatedProfile = {
      ...next,
      loyaltyPoints: Number(next.loyaltyPoints || 0) + PROFILE_COMPLETION_BONUS,
      xpPoints: Number(next.xpPoints || 0) + PROFILE_COMPLETION_XP,
    };
    await AsyncStorage.setItem(profileKey(userId), JSON.stringify(updatedProfile));
    const notifications = await readNotifications(userId);
    await writeNotifications(userId, [
      {
        id: `n-${Date.now()}-profile-bonus`,
        type: 'profile_completed',
        title: 'Бонус за заполнение профиля',
        text: `+${PROFILE_COMPLETION_BONUS} бонусов за полное заполнение личных данных.`,
        createdAt: new Date().toISOString(),
      },
      {
        id: `n-${Date.now()}-profile-xp`,
        type: 'xp_earned',
        title: 'Опыт за заполнение профиля',
        text: `+${PROFILE_COMPLETION_XP} XP за полное заполнение профиля.`,
        createdAt: new Date().toISOString(),
      },
      ...notifications,
    ]);
    return updatedProfile;
  }
  return next;
}

export async function fetchFavorites(userId) {
  const raw = await AsyncStorage.getItem(favoritesKey(userId));
  return raw ? JSON.parse(raw) : [];
}

export async function toggleFavorite(userId, dishId) {
  const current = await fetchFavorites(userId);
  const next = current.includes(dishId)
    ? current.filter((id) => id !== dishId)
    : [...current, dishId];
  await AsyncStorage.setItem(favoritesKey(userId), JSON.stringify(next));
  return next;
}

export async function fetchNotifications(userId, options = {}) {
  const all = await readNotifications(userId);
  const limit = Math.max(1, Math.min(100, Math.floor(Number(options?.limit ?? 50))));
  const offset = Math.max(0, Math.floor(Number(options?.offset ?? 0)));
  return all.slice(offset, offset + limit);
}

export async function requestWaiterCall(payload, userId) {
  const place = [payload?.address, payload?.tableHint].filter(Boolean).join(', ');
  const notifications = await readNotifications(userId);
  await writeNotifications(userId, [
    {
      id: `n-${Date.now()}-waiter`,
      type: 'system',
      title: 'Вызов официанта',
      text: place
        ? `Запрос передан в зал (демо): ${place}.`
        : 'Запрос передан в зал (демо). В продакшене событие уходит в приложение персонала.',
      createdAt: new Date().toISOString(),
    },
    ...notifications,
  ]);
  return { ok: true };
}

export async function registerPushDevice() {
  return { ok: true };
}

export async function sendTestPush(userId, payload = {}) {
  const notifications = await readNotifications(userId);
  await writeNotifications(userId, [
    {
      id: `n-${Date.now()}-push`,
      type: 'push',
      title: String(payload?.title || 'Push-уведомление'),
      text: String(payload?.body || 'Тестовое push-событие доставлено в приложение.'),
      targetScreen: String(payload?.targetScreen || 'Orders'),
      targetId: String(payload?.targetId || ''),
      createdAt: new Date().toISOString(),
    },
    ...notifications,
  ]);
  return { ok: true };
}

export async function fetchDishIngredients() {
  return [];
}

export async function fetchDishModifiers() {
  return [];
}

export async function applyPromoCode(code) {
  return {
    id: 1,
    code: String(code || 'DEMO'),
    discountValue: 5,
    isPercentage: true,
    isActive: true,
  };
}

export async function spendBonusPoints() {
  return { id: 1, type: 'SPENDING', amount: 0 };
}

export async function fetchReservationById(id) {
  return {
    id: Number(id) || id,
    reservDate: '2026-06-01',
    reservHourFrom: '19:00:00',
    reservHourTo: '21:00:00',
    status: 'CREATED',
    guestName: 'Демо гость',
    guestPhoneNumber: '+79990000000',
    table: { id: 1, seatCount: 4, status: 'AVAILABLE' },
  };
}
