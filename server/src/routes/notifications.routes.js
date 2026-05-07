import express from 'express';
import { db } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseUserId } from '../utils/userId.js';

const router = express.Router();

function parsePage(query) {
  const rawLimit = Number(query?.limit ?? 50);
  const rawOffset = Number(query?.offset ?? 0);
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 50;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;
  return { limit, offset };
}

function parseNotificationBody(rawBody) {
  const fallback = { text: String(rawBody || ''), targetScreen: '', targetId: '' };
  if (!rawBody) return fallback;
  try {
    const parsed = JSON.parse(String(rawBody));
    return {
      text: String(parsed?.text || parsed?.body || ''),
      targetScreen: String(parsed?.targetScreen || ''),
      targetId: String(parsed?.targetId || ''),
    };
  } catch {
    return fallback;
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.query.userId);
    const { limit, offset } = parsePage(req.query);
    const [rows] = await db.query(
      `
      SELECT id, type, title, body, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      OFFSET ?
      `,
      [userId, limit, offset]
    );

    res.json(
      rows.map((row) => {
        const body = parseNotificationBody(row.body);
        return {
          id: `n-${row.id}`,
          type: row.type,
          title: row.title,
          text: body.text,
          targetScreen: body.targetScreen,
          targetId: body.targetId,
          createdAt: row.created_at,
        };
      })
    );
  })
);

export default router;
