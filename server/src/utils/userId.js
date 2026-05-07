import { HttpError } from './httpError.js';

export function parseUserId(raw) {
  const value = String(raw || '').trim();
  const normalized = value.startsWith('u-') ? value.slice(2) : value;
  const id = Number(normalized);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'Invalid userId', 'VALIDATION_ERROR');
  }
  return id;
}
