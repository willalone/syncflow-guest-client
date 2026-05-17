/** Синхронизировано с API_DOCS.md §2.6 */
export const RECOVERY_STAGE = {
  REQUEST: 'request',
  VERIFY: 'verify',
};

export const RECOVERY_CODE_LENGTH = 6;
export const RECOVERY_MIN_PASSWORD_LENGTH = 6;
export const RECOVERY_CODE_TTL_MINUTES = 15;

export function pickServerMessage(data, fallback) {
  const msg = data?.message;
  return typeof msg === 'string' && msg.trim() ? msg.trim() : fallback;
}
