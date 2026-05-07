import express from 'express';
import { db } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseUserId } from '../utils/userId.js';
import { HttpError } from '../utils/httpError.js';
import { dishes as fallbackDishes } from '../../../src/data/menu.js';

const router = express.Router();

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveFallbackIdByMeta({ name, price, category }) {
  const normalizedName = normalizeText(name);
  const normalizedCategory = normalizeText(category);
  const numericPrice = Number(price || 0);
  const byName = fallbackDishes.filter((dish) => normalizeText(dish.title) === normalizedName);
  if (!byName.length) return null;
  const byNameAndCategory = normalizedCategory
    ? byName.filter((dish) => normalizeText(dish.category) === normalizedCategory)
    : byName;
  const candidates = byNameAndCategory.length ? byNameAndCategory : byName;
  const exactPrice = candidates.find((dish) => Number(dish.price || 0) === numericPrice);
  return (exactPrice || candidates[0] || null)?.id || null;
}

async function getOrCreateRestaurantId(conn) {
  const [[existing]] = await conn.query('SELECT id FROM restaurants ORDER BY id ASC LIMIT 1');
  if (existing?.id) return Number(existing.id);
  await conn.query(
    `
    INSERT INTO restaurants (name, slug, phone, email, address_line, city, timezone, is_active)
    VALUES (?, ?, NULL, NULL, ?, ?, 'Europe/Moscow', 1)
    `,
    ['SyncFlow Restaurant', 'syncflow-main', 'Москва, ул. Ленина, 24', 'Москва']
  );
  const [[created]] = await conn.query('SELECT id FROM restaurants ORDER BY id ASC LIMIT 1');
  if (!created?.id) throw new HttpError(500, 'Не удалось создать ресторан по умолчанию', 'DB_INIT_ERROR');
  return Number(created.id);
}

async function getOrCreateFavoritesCategoryId(conn, restaurantId) {
  const [[existing]] = await conn.query(
    'SELECT id FROM menu_categories WHERE restaurant_id = ? AND name = ? LIMIT 1',
    [restaurantId, 'Избранное']
  );
  if (existing?.id) return Number(existing.id);
  const [inserted] = await conn.query(
    'INSERT INTO menu_categories (restaurant_id, name, sort_order, is_active) VALUES (?, ?, 100, 1)',
    [restaurantId, 'Избранное']
  );
  return Number(inserted.insertId);
}

async function resolveDishId(conn, rawDishId) {
  const numericId = Number(rawDishId);
  if (Number.isFinite(numericId) && numericId > 0) {
    return numericId;
  }

  const slug = String(rawDishId || '').trim();
  if (!slug) {
    throw new HttpError(400, 'Invalid dishId', 'VALIDATION_ERROR');
  }

  const fallback = fallbackDishes.find((dish) => dish.id === slug);
  const dishTitle = fallback?.title || slug;
  const dishPrice = Number(fallback?.price || 0);

  const restaurantId = await getOrCreateRestaurantId(conn);
  const categoryId = await getOrCreateFavoritesCategoryId(conn, restaurantId);

  const [[existingByName]] = await conn.query(
    'SELECT id FROM menu_items WHERE restaurant_id = ? AND name = ? AND price = ? LIMIT 1',
    [restaurantId, dishTitle, dishPrice]
  );
  if (existingByName?.id) return Number(existingByName.id);

  const [inserted] = await conn.query(
    `
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_available, sort_order)
    VALUES (?, ?, ?, NULL, ?, 1, 100)
    `,
    [restaurantId, categoryId, dishTitle, dishPrice]
  );
  return Number(inserted.insertId);
}

function toClientFavoriteId(row) {
  const fallbackId = resolveFallbackIdByMeta({
    name: row?.name,
    price: row?.price,
    category: row?.category_name,
  });
  if (fallbackId) return String(fallbackId);
  return String(row.menu_item_id);
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.query.userId);
    const [rows] = await db.query(
      `
      SELECT uf.menu_item_id, mi.name, mi.price, mc.name AS category_name
      FROM user_favorites uf
      JOIN menu_items mi ON mi.id = uf.menu_item_id
      LEFT JOIN menu_categories mc ON mc.id = mi.category_id
      WHERE uf.user_id = ?
      ORDER BY uf.created_at DESC
      `,
      [userId]
    );
    res.json([...new Set(rows.map(toClientFavoriteId))]);
  })
);

router.post(
  '/toggle',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.body.userId);
    const conn = await db.getConnection();
    let dishId;
    try {
      dishId = await resolveDishId(conn, req.body.dishId);
    } finally {
      conn.release();
    }

    const [[exists]] = await db.query(
      'SELECT 1 AS ok FROM user_favorites WHERE user_id = ? AND menu_item_id = ? LIMIT 1',
      [userId, dishId]
    );
    if (exists) {
      await db.query('DELETE FROM user_favorites WHERE user_id = ? AND menu_item_id = ?', [userId, dishId]);
    } else {
      await db.query('INSERT INTO user_favorites (user_id, menu_item_id) VALUES (?, ?)', [userId, dishId]);
    }

    const [rows] = await db.query(
      `
      SELECT uf.menu_item_id, mi.name, mi.price, mc.name AS category_name
      FROM user_favorites uf
      JOIN menu_items mi ON mi.id = uf.menu_item_id
      LEFT JOIN menu_categories mc ON mc.id = mi.category_id
      WHERE uf.user_id = ?
      ORDER BY uf.created_at DESC
      `,
      [userId]
    );
    res.json([...new Set(rows.map(toClientFavoriteId))]);
  })
);

export default router;
