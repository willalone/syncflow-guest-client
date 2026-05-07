import express from 'express';
import { db } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { parseUserId } from '../utils/userId.js';

const router = express.Router();

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

router.post(
  '/waiter',
  asyncHandler(async (req, res) => {
    const { userId: rawUserId, context, tableHint, message, address } = req.body || {};
    const userId = parseUserId(rawUserId);
    const [[userRow]] = await db.query('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!userRow?.id) {
      throw new HttpError(401, 'Сессия устарела. Войдите снова.', 'UNAUTHORIZED');
    }
    const meta = {
      userId,
      context: context ? String(context) : 'unknown',
      address: address ? String(address) : '',
      tableHint: tableHint ? String(tableHint) : '',
      message: message ? String(message) : '',
      createdAt: new Date().toISOString(),
    };
    // actor_user_id = NULL: избегаем сбоев FK, если в журнале ожидается только «живой» пользователь БД;
    // userId хранится в meta_json.
    await db.query(
      `
      INSERT INTO audit_logs (actor_user_id, entity_type, entity_id, action, meta_json)
      VALUES (NULL, 'waiter_call', NULL, 'request', ?)
      `,
      [JSON.stringify(meta)]
    );
    const place = [meta.address, meta.tableHint].filter(Boolean).join(', ');
    await insertNotificationSafe({
      userId,
      type: 'system',
      title: 'Вызов официанта',
      body: place ? `Запрос принят: ${place}.` : 'Запрос передан в зал.',
    });
    res.json({ ok: true });
  })
);

export default router;
