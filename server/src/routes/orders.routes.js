import express from 'express';
import { db } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { parseUserId } from '../utils/userId.js';

const router = express.Router();
const LOYALTY_CONVERSION_RATE = 1; // 1 point = 1 RUB
const MAX_DISCOUNT_SHARE = 0.5;

async function insertNotificationSafe({ userId, type, title, body }) {
  try {
    await db.query('INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)', [
      userId,
      type,
      title,
      body,
    ]);
  } catch (error) {
    if (error?.code === 'WARN_DATA_TRUNCATED') {
      const fallbackType = type === 'payment' ? 'order_status' : 'system';
      await db.query('INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)', [
        userId,
        fallbackType,
        title,
        body,
      ]);
      return;
    }
    throw error;
  }
}

function parsePage(query) {
  const rawLimit = Number(query?.limit ?? 30);
  const rawOffset = Number(query?.offset ?? 0);
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 30;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;
  return { limit, offset };
}

function parseOrderDbId(rawOrderId) {
  const value = String(rawOrderId || '').replace(/^order-/, '');
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new HttpError(400, 'Invalid orderId', 'VALIDATION_ERROR');
  }
  return parsed;
}

function parseOrderMeta(rawComment) {
  const fallback = {
    orderType: String(rawComment || 'booking'),
    scheduledAt: '',
    deliveryDetails: null,
    deliveryStatus: '',
  };
  if (!rawComment) return fallback;
  try {
    const parsed = JSON.parse(String(rawComment));
    return {
      orderType: parsed?.orderType || 'booking',
      scheduledAt: parsed?.scheduledAt || '',
      deliveryDetails: parsed?.deliveryDetails || null,
      deliveryStatus: parsed?.deliveryStatus || '',
    };
  } catch {
    return fallback;
  }
}

async function getOrCreateRestaurantId(conn) {
  const [[existing]] = await conn.query('SELECT id FROM restaurants ORDER BY id ASC LIMIT 1');
  if (existing?.id) {
    return Number(existing.id);
  }
  await conn.query(
    `
    INSERT INTO restaurants (name, slug, phone, email, address_line, city, timezone, is_active)
    VALUES (?, ?, NULL, NULL, ?, ?, 'Europe/Moscow', 1)
    `,
    ['SyncFlow Restaurant', 'syncflow-main', 'Москва, ул. Ленина, 24', 'Москва']
  );
  const [[created]] = await conn.query('SELECT id FROM restaurants ORDER BY id ASC LIMIT 1');
  if (!created?.id) {
    throw new HttpError(500, 'Не удалось создать ресторан по умолчанию', 'DB_INIT_ERROR');
  }
  return Number(created.id);
}

async function getOrCreateOrderCategoryId(conn, restaurantId) {
  const [[existing]] = await conn.query(
    `
    SELECT id
    FROM menu_categories
    WHERE restaurant_id = ? AND name = ?
    LIMIT 1
    `,
    [restaurantId, 'Основное меню']
  );
  if (existing?.id) {
    return Number(existing.id);
  }
  const [inserted] = await conn.query(
    `
    INSERT INTO menu_categories (restaurant_id, name, sort_order, is_active)
    VALUES (?, ?, 100, 1)
    `,
    [restaurantId, 'Основное меню']
  );
  return Number(inserted.insertId);
}

async function resolveMenuItemId(conn, { restaurantId, categoryId, item }) {
  const numericId = Number(item?.id);
  if (Number.isFinite(numericId) && numericId > 0) {
    const [[existingById]] = await conn.query(
      'SELECT id FROM menu_items WHERE id = ? AND restaurant_id = ? LIMIT 1',
      [numericId, restaurantId]
    );
    if (existingById?.id) {
      return Number(existingById.id);
    }
  }

  const itemTitle = String(item?.title || '').trim() || `Позиция ${String(item?.id || '').trim() || 'без id'}`;
  const [[existingByName]] = await conn.query(
    'SELECT id FROM menu_items WHERE restaurant_id = ? AND name = ? LIMIT 1',
    [restaurantId, itemTitle]
  );
  if (existingByName?.id) {
    return Number(existingByName.id);
  }

  const [inserted] = await conn.query(
    `
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_available, sort_order)
    VALUES (?, ?, ?, NULL, ?, 1, 100)
    `,
    [restaurantId, categoryId, itemTitle, Number(item?.unitPrice || 0)]
  );
  return Number(inserted.insertId);
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.query.userId);
    const { limit, offset } = parsePage(req.query);

    const [orders] = await db.query(
      `
      SELECT id, booking_id, total_amount, subtotal_amount, discount_amount, bonus_earned, bonus_spent, address_snapshot, created_at, status, comment
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      OFFSET ?
      `,
      [userId, limit, offset]
    );

    if (!orders.length) {
      return res.json([]);
    }

    const orderIds = orders.map((o) => o.id);
    const [items] = await db.query(
      `
      SELECT order_id, menu_item_id, item_name_snapshot, unit_price, quantity
      FROM order_items
      WHERE order_id IN (?)
      ORDER BY id ASC
      `,
      [orderIds]
    );

    const itemsByOrder = new Map();
    items.forEach((item) => {
      if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
      itemsByOrder.get(item.order_id).push({
        id: String(item.menu_item_id),
        title: item.item_name_snapshot,
        unitPrice: Number(item.unit_price),
        quantity: Number(item.quantity),
      });
    });

    res.json(
      orders.map((order) => {
        const isPaid = ['confirmed', 'completed'].includes(String(order.status || ''));
        return {
          ...parseOrderMeta(order.comment),
          id: `order-${order.id}`,
          total: Number(order.total_amount),
          subtotal: Number(order.subtotal_amount || order.total_amount),
          discount: Number(order.discount_amount || 0),
          bonusSpent: Number(order.bonus_spent || 0),
          bonusEarned: Number(order.bonus_earned || 0),
          xpEarned: isPaid ? Math.round(Number(order.total_amount || 0) * 0.05) : 0,
          bookingId: order.booking_id ? `booking-${order.booking_id}` : null,
          paymentStatus: isPaid ? 'paid' : 'pending',
          bookingDraft: { address: order.address_snapshot || '' },
          createdAt: order.created_at,
          status: order.status,
          items: itemsByOrder.get(order.id) || [],
        };
      })
    );
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      userId: rawUserId,
      items,
      total,
      bookingDraft,
      bookingId: rawBookingId,
      scheduledAt = '',
      orderType = 'booking',
      useLoyaltyPoints = false,
      pointsToSpend = 0,
      deliveryDetails = null,
    } = req.body;
    const userId = parseUserId(rawUserId);
    if (!Array.isArray(items) || !items.length) {
      throw new HttpError(400, 'Order must include items', 'VALIDATION_ERROR');
    }

    const bookingId = rawBookingId ? Number(String(rawBookingId).replace(/^booking-/, '')) : null;
    const orderMeta = JSON.stringify({
      orderType: String(orderType),
      scheduledAt: String(scheduledAt || ''),
      deliveryDetails: deliveryDetails || null,
      deliveryStatus: orderType === 'delivery' ? 'created' : '',
    });
    const subtotal = Number(total || 0);
    const [[account]] = await db.query('SELECT COALESCE(balance, 0) AS balance FROM loyalty_accounts WHERE user_id = ? LIMIT 1', [userId]);
    const availablePoints = Number(account?.balance || 0);
    const requestedPoints = useLoyaltyPoints ? Math.max(0, Math.floor(Number(pointsToSpend || 0))) : 0;
    const maxSpendByTotal = Math.floor(subtotal * MAX_DISCOUNT_SHARE * LOYALTY_CONVERSION_RATE);
    if (useLoyaltyPoints && requestedPoints > availablePoints) {
      throw new HttpError(400, `Недостаточно баллов: доступно ${availablePoints}, запрошено ${requestedPoints}.`, 'VALIDATION_ERROR');
    }
    if (useLoyaltyPoints && requestedPoints > maxSpendByTotal) {
      throw new HttpError(400, `Можно списать максимум ${maxSpendByTotal} баллов (до 50% суммы заказа).`, 'VALIDATION_ERROR');
    }
    const bonusSpent = Math.min(availablePoints, maxSpendByTotal, requestedPoints);
    const discountAmount = Number((bonusSpent / LOYALTY_CONVERSION_RATE).toFixed(2));
    const payableTotal = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));
    const xpEarned = 0;
    const bonusEarned = 0;
    const orderNumber = `ORD-${Date.now()}`;
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();
      const restaurantId = await getOrCreateRestaurantId(conn);
      const categoryId = await getOrCreateOrderCategoryId(conn, restaurantId);
      const [orderInsert] = await conn.query(
        `
        INSERT INTO orders
        (order_number, restaurant_id, user_id, status, subtotal_amount, discount_amount, total_amount, bonus_earned, bonus_spent, address_snapshot, comment)
        VALUES (?, ?, ?, 'created', ?, ?, ?, ?, ?, ?, ?)
        `,
        [orderNumber, restaurantId, userId, subtotal, discountAmount, payableTotal, bonusEarned, bonusSpent, bookingDraft?.address || null, orderMeta]
      );
      const orderId = orderInsert.insertId;
      if (bookingId) {
        await conn.query('UPDATE orders SET booking_id = ? WHERE id = ? AND user_id = ?', [bookingId, orderId, userId]);
      }

      for (const item of items) {
        const menuItemId = await resolveMenuItemId(conn, { restaurantId, categoryId, item });
        await conn.query(
          `
          INSERT INTO order_items
          (order_id, menu_item_id, item_name_snapshot, unit_price, quantity, line_total)
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            orderId,
            menuItemId,
            item.title || `Позиция ${item.id}`,
            Number(item.unitPrice || 0),
            Number(item.quantity || 1),
            Number(item.unitPrice || 0) * Number(item.quantity || 1),
          ]
        );
      }

      if (bonusSpent > 0) {
        await conn.query(
          `
          INSERT INTO loyalty_transactions (user_id, order_id, transaction_type, points_delta, reason)
          VALUES (?, ?, 'spend', ?, ?)
          `,
          [userId, orderId, -bonusSpent, 'Списание бонусов при оформлении заказа']
        );
      }
      await conn.query(
        `
        INSERT INTO loyalty_accounts (user_id, balance, total_earned, total_spent)
        VALUES (?, ?, ?, 0)
        ON DUPLICATE KEY UPDATE
          balance = balance + VALUES(balance) - ?,
          total_earned = total_earned + VALUES(total_earned),
          total_spent = total_spent + ?
        `,
        [userId, bonusEarned, bonusEarned, bonusSpent, bonusSpent]
      );

      if (bonusSpent > 0) {
        await conn.query(
          'INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)',
          [userId, 'system', 'Бонусы списаны', `Заказ на ${subtotal} руб.: списано ${bonusSpent} баллов, скидка ${discountAmount} руб.`]
        );
      }
      if (bonusEarned > 0) {
        await conn.query(
          'INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)',
          [userId, 'bonus_earned', 'Начислены бонусы за заказ', `+${bonusEarned} бонусов (5% от оплаченной суммы ${payableTotal} руб.).`]
        );
      }
      if (orderType === 'delivery') {
        const destination = String(deliveryDetails?.addressLine || bookingDraft?.address || 'указанный адрес');
        await insertNotificationSafe({
          userId,
          type: 'push',
          title: 'Доставка: создано',
          body: JSON.stringify({
            text: `Заказ доставки создан. Адрес: ${destination}.`,
            targetScreen: 'Deliveries',
            targetId: `order-${orderId}`,
          }),
        });
      }

      await conn.commit();

      res.status(201).json({
        id: `order-${orderId}`,
        status: 'created',
        items,
        subtotal,
        discount: discountAmount,
        total: payableTotal,
        orderType,
        deliveryDetails: deliveryDetails || null,
        deliveryStatus: orderType === 'delivery' ? 'created' : '',
        scheduledAt: String(scheduledAt || ''),
        bookingId: bookingId ? `booking-${bookingId}` : null,
        paymentStatus: 'pending',
        bonusSpent,
        bonusEarned,
        xpEarned,
        bookingDraft: bookingDraft || {},
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  })
);

router.post(
  '/:orderId/pay',
  asyncHandler(async (req, res) => {
    const orderDbId = parseOrderDbId(req.params.orderId);
    const userId = parseUserId(req.body?.userId);
    const [[orderRow]] = await db.query('SELECT id, status FROM orders WHERE id = ? AND user_id = ? LIMIT 1', [orderDbId, userId]);
    if (!orderRow?.id) {
      throw new HttpError(404, 'Заказ не найден', 'NOT_FOUND');
    }
    const isAlreadyPaid = ['confirmed', 'completed'].includes(String(orderRow.status || ''));
    let bonusEarned = Number(orderRow?.bonus_earned || 0);
    let xpEarned = 0;
    if (!isAlreadyPaid) {
      const [[payableRow]] = await db.query('SELECT total_amount, bonus_spent FROM orders WHERE id = ? AND user_id = ? LIMIT 1', [orderDbId, userId]);
      const payableTotal = Number(payableRow?.total_amount || 0);
      const spent = Number(payableRow?.bonus_spent || 0);
      xpEarned = Math.round(payableTotal * 0.05);
      bonusEarned = spent > 0 ? 0 : Math.round(payableTotal * 0.05);
      await db.query(
        "UPDATE orders SET status = 'confirmed' WHERE id = ? AND user_id = ? AND status IN ('created', 'draft')",
        [orderDbId, userId]
      );
      await db.query('UPDATE orders SET bonus_earned = ? WHERE id = ? AND user_id = ?', [bonusEarned, orderDbId, userId]);
      if (bonusEarned > 0) {
        await db.query(
          `
          INSERT INTO loyalty_transactions (user_id, order_id, transaction_type, points_delta, reason)
          VALUES (?, ?, 'earn', ?, ?)
          `,
          [userId, orderDbId, bonusEarned, 'Начисление бонусов после успешной оплаты заказа']
        );
      }
      await db.query(
        `
        INSERT INTO loyalty_accounts (user_id, balance, total_earned, total_spent)
        VALUES (?, ?, ?, 0)
        ON DUPLICATE KEY UPDATE
          balance = balance + VALUES(balance),
          total_earned = total_earned + VALUES(total_earned)
        `,
        [userId, bonusEarned, bonusEarned]
      );
      if (bonusEarned > 0) {
        await db.query('INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)', [
          userId,
          'bonus_earned',
          'Начислены бонусы за заказ',
          `+${bonusEarned} бонусов после оплаты заказа.`,
        ]);
      }
      if (xpEarned > 0) {
        await db.query('INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)', [
          userId,
          'system',
          'Начислен опыт',
          `+${xpEarned} XP после оплаты заказа.`,
        ]);
      }
      const [[metaOrder]] = await db.query('SELECT comment FROM orders WHERE id = ? AND user_id = ? LIMIT 1', [orderDbId, userId]);
      const parsedMeta = parseOrderMeta(metaOrder?.comment);
      if (parsedMeta.orderType === 'delivery') {
        const leaveAtDoor = parsedMeta?.deliveryDetails?.leaveAtDoor ? ' Оставить у двери: да.' : '';
        const addressLine = String(parsedMeta?.deliveryDetails?.addressLine || 'указанный адрес');
        const commonTarget = { targetScreen: 'Deliveries', targetId: `order-${orderDbId}` };
        await insertNotificationSafe({
          userId,
          type: 'push',
          title: 'Доставка: готовится',
          body: JSON.stringify({ text: `Заказ готовится к отправке.${leaveAtDoor}`, ...commonTarget }),
        });
        await insertNotificationSafe({
          userId,
          type: 'push',
          title: 'Доставка: в пути',
          body: JSON.stringify({ text: `Курьер в пути. Адрес: ${addressLine}.`, ...commonTarget }),
        });
        await insertNotificationSafe({
          userId,
          type: 'push',
          title: 'Доставка: осталось 15 минут',
          body: JSON.stringify({ text: 'Курьер будет у вас примерно через 15 минут.', ...commonTarget }),
        });
        await insertNotificationSafe({
          userId,
          type: 'push',
          title: 'Доставка: заказ у вас',
          body: JSON.stringify({
            text: parsedMeta?.deliveryDetails?.leaveAtDoor
              ? 'Заказ доставлен и оставлен у двери.'
              : 'Курьер прибыл. Заказ у вас.',
            ...commonTarget,
          }),
        });
      }
    }
    await insertNotificationSafe({
      userId,
      type: 'payment',
      title: 'Оплата выполнена',
      body: `Заказ #${orderDbId} успешно оплачен.`,
    });
    res.json({ id: `order-${orderDbId}`, paymentStatus: 'paid', status: 'confirmed', bonusEarned, xpEarned });
  })
);

router.post(
  '/:orderId/review',
  asyncHandler(async (req, res) => {
    const orderDbId = parseOrderDbId(req.params.orderId);
    const userId = parseUserId(req.body?.userId);
    const rating = Math.max(1, Math.min(5, Number(req.body?.rating || 5)));
    const comment = String(req.body?.comment || '').slice(0, 1000);
    const menuItemIdRaw = req.body?.menuItemId;

    const menuItemId = Number(menuItemIdRaw);
    if (!Number.isFinite(menuItemId) || menuItemId <= 0) {
      throw new HttpError(400, 'Некорректный menuItemId для отзыва', 'VALIDATION_ERROR');
    }

    const [[orderRow]] = await db.query(
      'SELECT id, status FROM orders WHERE id = ? AND user_id = ? LIMIT 1',
      [orderDbId, userId]
    );
    if (!orderRow?.id) {
      throw new HttpError(404, 'Заказ не найден', 'NOT_FOUND');
    }
    if (!['confirmed', 'completed'].includes(String(orderRow.status || ''))) {
      throw new HttpError(400, 'Отзыв можно оставить только после оплаты заказа', 'VALIDATION_ERROR');
    }

    const [[hasItem]] = await db.query(
      'SELECT 1 AS ok FROM order_items WHERE order_id = ? AND menu_item_id = ? LIMIT 1',
      [orderDbId, menuItemId]
    );
    if (!hasItem?.ok) {
      throw new HttpError(400, 'Позиция отзыва не относится к указанному заказу', 'VALIDATION_ERROR');
    }

    const [[existingReview]] = await db.query(
      'SELECT id FROM menu_item_reviews WHERE order_id = ? AND user_id = ? LIMIT 1',
      [orderDbId, userId]
    );
    if (existingReview?.id) {
      throw new HttpError(409, 'Отзыв по этому заказу уже отправлен', 'VALIDATION_ERROR');
    }

    await db.query(
      `
      INSERT INTO menu_item_reviews (menu_item_id, user_id, order_id, rating, comment, is_public)
      VALUES (?, ?, ?, ?, ?, 1)
      `,
      [menuItemId, userId, orderDbId, rating, comment || null]
    );
    await insertNotificationSafe({
      userId,
      type: 'review',
      title: 'Спасибо за отзыв',
      body: `Оценка ${rating}/5 сохранена.`,
    });

    res.status(201).json({ ok: true, orderId: `order-${orderDbId}`, rating, comment });
  })
);

export default router;
