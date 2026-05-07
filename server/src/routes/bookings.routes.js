import express from 'express';
import { db } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { parseUserId } from '../utils/userId.js';

const router = express.Router();

function parseTableId(raw) {
  const value = String(raw || '');
  return Number(value.replace(/^t/, ''));
}

const fallbackTableMeta = {
  t1: { code: 'T1', zoneName: 'У окна', capacity: 2 },
  t2: { code: 'T2', zoneName: 'Угольник', capacity: 4 },
  t3: { code: 'T3', zoneName: 'Большой стол', capacity: 6 },
};

function normalizePreorder(raw) {
  if (!raw) return null;
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object') return null;
  return {
    items: Array.isArray(data.items) ? data.items : [],
    servingTime: data.servingTime ? String(data.servingTime) : '',
    bookingTime: data.bookingTime ? String(data.bookingTime) : '',
  };
}

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
      await db.query('INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)', [
        userId,
        'system',
        title,
        body,
      ]);
      return;
    }
    throw error;
  }
}

function toSqlDate(rawDate) {
  const value = String(rawDate || '').trim();
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    throw new HttpError(400, 'Неверный формат даты. Используйте ДД.ММ.ГГГГ', 'VALIDATION_ERROR');
  }
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

async function getOrCreateRestaurantId() {
  const [[existing]] = await db.query('SELECT id FROM restaurants ORDER BY id ASC LIMIT 1');
  if (existing?.id) {
    return Number(existing.id);
  }
  await db.query(
    `
    INSERT INTO restaurants (name, slug, phone, email, address_line, city, timezone, is_active)
    VALUES (?, ?, NULL, NULL, ?, ?, 'Europe/Moscow', 1)
    `,
    ['SyncFlow Restaurant', 'syncflow-main', 'Москва, ул. Ленина, 24', 'Москва']
  );
  const [[created]] = await db.query('SELECT id FROM restaurants ORDER BY id ASC LIMIT 1');
  if (!created?.id) {
    throw new HttpError(500, 'Не удалось создать ресторан по умолчанию', 'DB_INIT_ERROR');
  }
  return Number(created.id);
}

async function resolveDiningTableId({ rawTableId, restaurantId, people }) {
  const tableNumericId = parseTableId(rawTableId);
  if (tableNumericId) {
    const [[existingById]] = await db.query(
      'SELECT id FROM dining_tables WHERE id = ? AND restaurant_id = ? LIMIT 1',
      [tableNumericId, restaurantId]
    );
    if (existingById?.id) return Number(existingById.id);
  }

  const normalizedRaw = String(rawTableId || '').trim().toLowerCase();
  const meta = fallbackTableMeta[normalizedRaw] || {
    code: `T${tableNumericId || Date.now()}`,
    zoneName: `Стол ${tableNumericId || ''}`.trim(),
    capacity: Math.max(1, Number(people || 1)),
  };

  const [[existingByCode]] = await db.query(
    'SELECT id FROM dining_tables WHERE restaurant_id = ? AND table_code = ? LIMIT 1',
    [restaurantId, meta.code]
  );
  if (existingByCode?.id) return Number(existingByCode.id);

  const [inserted] = await db.query(
    `
    INSERT INTO dining_tables (restaurant_id, table_code, zone_name, capacity, is_active)
    VALUES (?, ?, ?, ?, 1)
    `,
    [restaurantId, meta.code, meta.zoneName, Math.max(meta.capacity, Number(people || 1))]
  );
  return Number(inserted.insertId);
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.query.userId);
    const [rows] = await db.query(
      `
      SELECT id, guest_count, booking_date, booking_time, address_snapshot, status, preorder_snapshot
      FROM bookings
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.json(
      rows.map((row) => ({
        id: `booking-${row.id}`,
        people: Number(row.guest_count),
        date: row.booking_date,
        time: String(row.booking_time).slice(0, 5),
        address: row.address_snapshot || '',
        status: row.status,
        preorder: normalizePreorder(row.preorder_snapshot),
      }))
    );
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { userId: rawUserId, people, date, time, address, tableId, preorderItems, servingTime } = req.body;
    const userId = parseUserId(rawUserId);
    if (!people || !date || !time) {
      throw new HttpError(400, 'Invalid booking payload', 'VALIDATION_ERROR');
    }

    const sqlDate = toSqlDate(date);
    const restaurantId = await getOrCreateRestaurantId();
    const diningTableId = await resolveDiningTableId({
      rawTableId: tableId,
      restaurantId,
      people: Number(people),
    });
    const bookingNumber = `BKG-${Date.now()}`;
    let preorderSnapshot = null;
    if (Array.isArray(preorderItems) && preorderItems.length) {
      preorderSnapshot = JSON.stringify({
        items: preorderItems.map((item) => ({
          id: item.id,
          title: String(item.title || ''),
          quantity: Math.max(1, Number(item.quantity || 1)),
          unitPrice: Number(item.unitPrice || 0),
        })),
        servingTime: String(servingTime || time || '').slice(0, 5),
        bookingTime: String(time || '').slice(0, 5),
      });
    }
    const [result] = await db.query(
      `
      INSERT INTO bookings
      (booking_number, restaurant_id, user_id, dining_table_id, guest_count, booking_date, booking_time, status, address_snapshot, preorder_snapshot)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
      `,
      [bookingNumber, restaurantId, userId, diningTableId, Number(people), sqlDate, time, address || null, preorderSnapshot]
    );

    const preorderHint = preorderSnapshot ? ` Предзаказ (${JSON.parse(preorderSnapshot).items.length} поз.) сохранён.` : '';
    await insertNotificationSafe({
      userId,
      type: 'booking_confirmed',
      title: 'Бронирование подтверждено',
      body: `Стол забронирован на ${date} ${time}.${preorderHint}`,
    });
    await insertNotificationSafe({
      userId,
      type: 'push',
      title: 'Напоминание о бронировании',
      body: `Напоминание: у вас бронь по адресу ${address || 'указанному адресу'} через 1 час.`,
    });

    res.status(201).json({
      id: `booking-${result.insertId}`,
      status: 'confirmed',
      people: Number(people),
      date,
      time,
      address: address || '',
      tableId,
      preorder: normalizePreorder(preorderSnapshot),
      createdAt: new Date().toISOString(),
    });
  })
);

export default router;
