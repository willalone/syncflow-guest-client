import express from 'express';
import { db } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseUserId } from '../utils/userId.js';
import { HttpError } from '../utils/httpError.js';

const router = express.Router();
const PROFILE_COMPLETION_BONUS = 150;

router.get(
  '/:userId',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.userId);
    const [[row]] = await db.query(
      `
      SELECT
        COALESCE(la.balance, 0) AS loyalty_points,
        COALESCE((SELECT ROUND(SUM(o.total_amount * 0.05)) FROM orders o WHERE o.user_id = u.id AND o.status IN ('confirmed', 'completed')), 0) AS xp_points,
        p.first_name,
        p.last_name,
        p.birth_date,
        p.avatar_url,
        u.phone,
        u.role
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      LEFT JOIN loyalty_accounts la ON la.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (!row) {
      throw new HttpError(404, 'Profile not found', 'NOT_FOUND');
    }

    res.json({
      role: row.role === 'customer' ? 'Гость' : row.role,
      loyaltyPoints: Number(row.loyalty_points || 0),
      xpPoints: Number(row.xp_points || 0),
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      birthDate: row.birth_date || '',
      avatarUrl: row.avatar_url || '',
      login: row.phone || '',
    });
  })
);

router.patch(
  '/:userId',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.userId);
    const { firstName, lastName, birthDate, login, avatarUrl } = req.body;

    const [[before]] = await db.query(
      `
      SELECT p.first_name, p.last_name, p.birth_date, u.phone
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [userId]
    );
    const wasComplete = Boolean(before?.first_name && before?.last_name && before?.birth_date && before?.phone);

    await db.query(
      `
      INSERT INTO user_profiles (user_id, first_name, last_name, birth_date, avatar_url, preferred_language)
      VALUES (?, ?, ?, ?, ?, 'ru')
      ON DUPLICATE KEY UPDATE
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        birth_date = VALUES(birth_date),
        avatar_url = VALUES(avatar_url)
      `,
      [userId, firstName || '', lastName || null, birthDate || null, avatarUrl || null]
    );

    if (login) {
      const nextPhone = String(login).replace(/\D/g, '');
      const [[phoneOwner]] = await db.query(
        'SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1',
        [nextPhone, userId]
      );
      if (phoneOwner?.id) {
        throw new HttpError(409, 'Этот номер уже используется другим аккаунтом', 'USER_EXISTS');
      }
      await db.query('UPDATE users SET phone = ? WHERE id = ?', [nextPhone, userId]);
    }

    const [[after]] = await db.query(
      `
      SELECT p.first_name, p.last_name, p.birth_date, u.phone
      FROM user_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
      LIMIT 1
      `,
      [userId]
    );
    const isComplete = Boolean(after?.first_name && after?.last_name && after?.birth_date && after?.phone);
    if (!wasComplete && isComplete) {
      await db.query(
        `
        INSERT INTO loyalty_accounts (user_id, balance, total_earned, total_spent)
        VALUES (?, ?, ?, 0)
        ON DUPLICATE KEY UPDATE
          balance = balance + VALUES(balance),
          total_earned = total_earned + VALUES(total_earned)
        `,
        [userId, PROFILE_COMPLETION_BONUS, PROFILE_COMPLETION_BONUS]
      );
      await db.query(
        `
        INSERT INTO loyalty_transactions (user_id, transaction_type, points_delta, reason)
        VALUES (?, 'manual_adjust', ?, ?)
        `,
        [userId, PROFILE_COMPLETION_BONUS, 'Бонус за полное заполнение профиля']
      );
      await db.query(
        'INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)',
        [userId, 'system', 'Бонус за заполнение профиля', `+${PROFILE_COMPLETION_BONUS} бонусов за полное заполнение профиля.`]
      );
    }

    const [[updated]] = await db.query(
      `
      SELECT
        COALESCE(la.balance, 0) AS loyalty_points,
        COALESCE((SELECT ROUND(SUM(o.total_amount * 0.05)) FROM orders o WHERE o.user_id = u.id AND o.status IN ('confirmed', 'completed')), 0) AS xp_points,
        p.first_name,
        p.last_name,
        p.birth_date,
        p.avatar_url,
        u.phone,
        u.role
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      LEFT JOIN loyalty_accounts la ON la.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [userId]
    );

    res.json({
      role: updated.role === 'customer' ? 'Гость' : updated.role,
      loyaltyPoints: Number(updated.loyalty_points || 0),
      xpPoints: Number(updated.xp_points || 0),
      firstName: updated.first_name || '',
      lastName: updated.last_name || '',
      birthDate: updated.birth_date || '',
      avatarUrl: updated.avatar_url || '',
      login: updated.phone || '',
    });
  })
);

export default router;
