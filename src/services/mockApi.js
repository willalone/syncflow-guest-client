import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookingTables, dishes } from '../data/menu';

const USERS_KEY = 'client_users_registry';
const profileKey = (userId) => `client_profile_${userId}`;
const notificationsKey = (userId) => `client_notifications_${userId}`;
const bookingsKey = (userId) => `client_bookings_${userId || 'guest'}`;
const ordersKey = (userId) => `client_orders_${userId || 'guest'}`;
const favoritesKey = (userId) => `client_favorites_${userId || 'guest'}`;
const cartKey = (userId) => `client_cart_${userId || 'guest'}`;

function withDelay(data, ms = 450) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), ms);
  });
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

async function readUsers() {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeUsers(users) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function appendNotification(userId, notification) {
  const raw = await AsyncStorage.getItem(notificationsKey(userId));
  const list = raw ? JSON.parse(raw) : [];
  const next = [
    {
      id: `n-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...notification,
    },
    ...list,
  ];
  await AsyncStorage.setItem(notificationsKey(userId), JSON.stringify(next));
}

export async function signIn({ phone, password }) {
  if (!phone || !password) {
    throw new Error('Введите логин и пароль');
  }

  const normalizedPhone = normalizePhone(phone);
  const users = await readUsers();
  const found = users.find((user) => user.phone === normalizedPhone);
  if (!found || found.password !== password) {
    throw new Error('Неверный логин или пароль');
  }

  return withDelay({
    token: `demo-token-syncflow-${found.id}`,
    user: {
      id: found.id,
      name: found.name,
      phone: found.phoneRaw,
      loyaltyPoints: found.loyaltyPoints || 0,
      role: found.role || 'Новый гость',
    },
  });
}

export async function signUp({ name, phone, password }) {
  if (!name?.trim() || !phone || !password) {
    throw new Error('Заполните имя, логин и пароль');
  }

  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 10) {
    throw new Error('Введите корректный логин');
  }

  const users = await readUsers();
  const alreadyExists = users.some((user) => user.phone === normalizedPhone);
  if (alreadyExists) {
    throw new Error('Пользователь с таким логином уже существует');
  }

  const suffix = normalizedPhone.slice(-6);
  const newUser = {
    id: `u-${suffix}`,
    name: name.trim(),
    phone: normalizedPhone,
    phoneRaw: phone,
    password,
    loyaltyPoints: 200,
    role: 'Новый гость',
    createdAt: new Date().toISOString(),
  };

  await writeUsers([...users, newUser]);
  await AsyncStorage.setItem(
    profileKey(newUser.id),
    JSON.stringify({
      role: newUser.role,
      loyaltyPoints: newUser.loyaltyPoints,
      firstName: newUser.name,
      lastName: '',
      birthDate: '',
      login: newUser.phoneRaw,
    })
  );
  await appendNotification(newUser.id, {
    type: 'welcome_bonus',
    title: 'Приветственные бонусы',
    text: 'Начислено 200 бонусов за регистрацию нового аккаунта.',
  });

  return withDelay({
    token: `demo-token-syncflow-${newUser.id}`,
    user: {
      id: newUser.id,
      name: newUser.name,
      phone: newUser.phoneRaw,
      loyaltyPoints: newUser.loyaltyPoints,
      role: newUser.role,
    },
  });
}

export async function updateAccount(userId, patch) {
  const users = await readUsers();
  const normalizedPhone = patch?.phoneRaw ? normalizePhone(patch.phoneRaw) : null;
  if (normalizedPhone && users.some((user) => user.id !== userId && user.phone === normalizedPhone)) {
    throw new Error('Пользователь с таким логином уже существует');
  }

  const nextUsers = users.map((user) =>
    user.id === userId
      ? {
          ...user,
          ...patch,
          phone: normalizedPhone || user.phone,
          phoneRaw: patch?.phoneRaw || user.phoneRaw,
        }
      : user
  );
  const found = nextUsers.find((user) => user.id === userId);
  if (!found) {
    throw new Error('Пользователь не найден');
  }
  await writeUsers(nextUsers);
  return {
    id: found.id,
    name: found.name,
    phone: found.phoneRaw,
    loyaltyPoints: found.loyaltyPoints || 0,
    role: found.role || 'Новый гость',
  };
}

export async function deleteAccount(userId) {
  const users = await readUsers();
  const found = users.find((user) => user.id === userId);
  if (!found) {
    throw new Error('Пользователь не найден');
  }

  const nextUsers = users.filter((user) => user.id !== userId);
  await writeUsers(nextUsers);

  await Promise.all([
    AsyncStorage.removeItem(profileKey(userId)),
    AsyncStorage.removeItem(notificationsKey(userId)),
    AsyncStorage.removeItem(bookingsKey(userId)),
    AsyncStorage.removeItem(ordersKey(userId)),
    AsyncStorage.removeItem(favoritesKey(userId)),
    AsyncStorage.removeItem(cartKey(userId)),
  ]);

  return withDelay({ ok: true }, 250);
}

export async function getMenu() {
  return withDelay({ categories: ['Все', ...new Set(dishes.map((d) => d.category))], dishes });
}

export async function getAvailableTables() {
  return withDelay(bookingTables);
}
