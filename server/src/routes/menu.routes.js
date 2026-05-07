import express from 'express';
import { db } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dishes as fallbackDishes } from '../../../src/data/menu.js';

const router = express.Router();

function normMenuTitle(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const fallbackImageByTitle = new Map(
  fallbackDishes.map((dish) => [normMenuTitle(dish.title), dish.imageUrl])
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      `
      SELECT
        mi.id,
        mi.name,
        mc.name AS category_name,
        mi.price,
        mi.weight_grams,
        mi.rating_avg,
        mi.image_url,
        mi.description,
        mi.ingredients
      FROM menu_items mi
      JOIN menu_categories mc ON mc.id = mi.category_id
      WHERE mi.is_available = 1 AND mc.is_active = 1
      ORDER BY mc.sort_order ASC, mi.sort_order ASC, mi.id ASC
      `
    );

    const fallbackCategories = [...new Set(fallbackDishes.map((dish) => dish.category))];
    const dbCategories = [...new Set(rows.map((value) => value.category_name).filter(Boolean))];
    const dbWithoutImageCount = rows.filter((row) => !row.image_url).length;
    const isDbCatalogIncomplete =
      !rows.length ||
      rows.length < fallbackDishes.length * 0.7 ||
      fallbackCategories.some((category) => !dbCategories.includes(category)) ||
      dbWithoutImageCount > rows.length * 0.4;

    if (isDbCatalogIncomplete) {
      return res.json({
        categories: ['Все', ...new Set(fallbackDishes.map((dish) => dish.category))],
        dishes: fallbackDishes,
      });
    }

    const categories = ['Все', ...new Set(rows.map((value) => value.category_name))];
    const dishes = rows.map((row) => {
      const fromDb = row.image_url != null && String(row.image_url).trim() ? String(row.image_url).trim() : '';
      const fromFallback = fallbackImageByTitle.get(normMenuTitle(row.name)) || '';
      return {
        id: String(row.id),
        title: row.name,
        category: row.category_name,
        price: Number(row.price),
        weight: row.weight_grams ? `${row.weight_grams} г` : '',
        rating: Number(row.rating_avg || 0),
        imageUrl: fromDb || fromFallback,
        description: row.description || '',
        ingredients: row.ingredients || '',
      };
    });

    res.json({ categories, dishes });
  })
);

export default router;
