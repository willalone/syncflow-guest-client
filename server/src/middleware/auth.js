import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function requireAuth(req, res, next) {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : null;
  if (!token) {
    throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.auth = payload;
    next();
  } catch {
    throw new HttpError(401, 'Invalid token', 'INVALID_TOKEN');
  }
}
