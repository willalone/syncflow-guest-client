import express from 'express';
import { db } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseUserId } from '../utils/userId.js';
import { HttpError } from '../utils/httpError.js';

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
  '/register',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.body?.userId);
    const platform = String(req.body?.platform || '').toLowerCase();
    const deviceToken = String(req.body?.deviceToken || '').trim();
    const deviceName = String(req.body?.deviceName || '').trim();
    const appVersion = String(req.body?.appVersion || '').trim();

    if (!['ios', 'android'].includes(platform)) {
      throw new HttpError(400, 'Некорректная платформа push-устройства', 'VALIDATION_ERROR');
    }
    if (!deviceToken) {
      throw new HttpError(400, 'deviceToken обязателен', 'VALIDATION_ERROR');
    }

    await db.query(
      `
      INSERT INTO push_devices (user_id, platform, device_token, device_name, app_version, is_active, last_seen_at)
      VALUES (?, ?, ?, ?, ?, 1, NOW())
      ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id),
        platform = VALUES(platform),
        device_name = VALUES(device_name),
        app_version = VALUES(app_version),
        is_active = 1,
        last_seen_at = NOW()
      `,
      [userId, platform, deviceToken, deviceName || null, appVersion || null]
    );

    res.status(201).json({ ok: true });
  })
);

router.post(
  '/test',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.body?.userId);
    const title = String(req.body?.title || 'Push-уведомление');
    const body = String(req.body?.body || 'Тестовое push-событие доставлено в приложение.');
    const targetScreen = String(req.body?.targetScreen || 'Orders');
    const targetId = req.body?.targetId ? String(req.body.targetId) : '';
    const payload = JSON.stringify({
      text: body,
      targetScreen,
      targetId,
    });

    await insertNotificationSafe({ userId, type: 'push', title, body: payload });

    res.status(201).json({ ok: true });
  })
);

export default router;
