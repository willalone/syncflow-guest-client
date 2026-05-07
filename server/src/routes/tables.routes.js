import express from 'express';
import { db } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const fallbackTables = [
  {
    id: 't1',
    name: 'У окна',
    seats: 2,
    from: '10:00',
    to: '23:00',
    address: 'Москва, ул. Пушкина, 10',
    imageUrl:
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 't2',
    name: 'Угольник',
    seats: 4,
    from: '10:00',
    to: '23:00',
    address: 'Москва, ул. Ленина, 24',
    imageUrl:
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 't3',
    name: 'Большой стол',
    seats: 6,
    from: '10:00',
    to: '23:00',
    address: 'Москва, Пресненская наб., 2',
    imageUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
  },
];

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      `
      SELECT
        dt.id,
        dt.zone_name,
        dt.capacity,
        CONCAT_WS(', ', r.city, r.address_line) AS address
      FROM dining_tables dt
      JOIN restaurants r ON r.id = dt.restaurant_id
      WHERE dt.is_active = 1
      ORDER BY dt.id ASC
      `
    );

    if (!rows.length) {
      return res.json(fallbackTables);
    }

    const imagePool = [
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
    ];

    const tables = rows.map((row, index) => ({
      id: `t${row.id}`,
      name: row.zone_name || `Стол ${row.id}`,
      seats: Number(row.capacity),
      from: '10:00',
      to: '23:00',
      imageUrl: imagePool[index % imagePool.length],
      address: row.address || 'ул. Пушкина, 10',
    }));

    res.json(tables);
  })
);

export default router;
