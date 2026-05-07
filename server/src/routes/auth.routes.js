import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      userId: user.id,
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

router.post(
  '/sign-up',
  asyncHandler(async (req, res) => {
    const { name, phone, password } = req.body;
    const trimmedName = String(name || '').trim();
    const normalizedPhone = normalizePhone(phone);
    if (!trimmedName || normalizedPhone.length < 10 || !String(password || '').trim()) {
      throw new HttpError(400, 'Invalid sign up payload', 'VALIDATION_ERROR');
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query('SELECT id FROM users WHERE phone = ?', [normalizedPhone]);
      if (existing.length) {
        throw new HttpError(409, 'User already exists', 'USER_EXISTS');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const [insertUser] = await conn.query(
        'INSERT INTO users (phone, password_hash, role) VALUES (?, ?, ?)',
        [normalizedPhone, passwordHash, 'customer']
      );
      const userId = insertUser.insertId;

      const [firstName, ...rest] = trimmedName.split(' ');
      const lastName = rest.join(' ') || null;

      await conn.query(
        'INSERT INTO user_profiles (user_id, first_name, last_name, preferred_language) VALUES (?, ?, ?, ?)',
        [userId, firstName, lastName, 'ru']
      );

      await conn.query(
        'INSERT INTO loyalty_accounts (user_id, balance, total_earned, total_spent) VALUES (?, ?, ?, ?)',
        [userId, 200, 200, 0]
      );

      await conn.query(
        'INSERT INTO loyalty_transactions (user_id, transaction_type, points_delta, reason) VALUES (?, ?, ?, ?)',
        [userId, 'welcome', 200, 'Приветственные бонусы за регистрацию']
      );

      await conn.query(
        'INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)',
        [userId, 'welcome_bonus', 'Приветственные бонусы', 'Начислено 200 бонусов за регистрацию нового аккаунта.']
      );

      await conn.commit();

      const token = signToken({ id: userId, role: 'customer' });
      res.status(201).json({
        token,
        user: {
          id: `u-${userId}`,
          name: trimmedName,
          phone,
          loyaltyPoints: 200,
          role: 'Новый гость',
        },
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  })
);

router.delete(
  '/account',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = Number(req.auth?.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new HttpError(401, 'Invalid token payload', 'INVALID_TOKEN');
    }

    const [result] = await db.query('DELETE FROM users WHERE id = ? AND status = "active" LIMIT 1', [userId]);
    if (!result?.affectedRows) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }

    res.json({ ok: true });
  })
);

router.post(
  '/sign-in',
  asyncHandler(async (req, res) => {
    const { phone, password } = req.body;
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || !password) {
      throw new HttpError(400, 'Phone and password are required', 'VALIDATION_ERROR');
    }

    const [rows] = await db.query(
      `
      SELECT
        u.id, u.password_hash, u.role,
        COALESCE(CONCAT_WS(' ', p.first_name, p.last_name), p.first_name, 'Гость') AS full_name,
        COALESCE(la.balance, 0) AS loyalty_points
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      LEFT JOIN loyalty_accounts la ON la.user_id = u.id
      WHERE u.phone = ? AND u.status = 'active'
      LIMIT 1
      `,
      [normalizedPhone]
    );

    if (!rows.length) {
      throw new HttpError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new HttpError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
    const token = signToken(user);

    res.json({
      token,
      user: {
        id: `u-${user.id}`,
        name: user.full_name || 'Гость',
        phone,
        loyaltyPoints: Number(user.loyalty_points || 0),
        role: user.role === 'customer' ? 'Гость' : user.role,
      },
    });
  })
);

export default router;
