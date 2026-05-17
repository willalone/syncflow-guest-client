/** Синхронизировано с API_DOCS.md §2.6 */
export const RECOVERY_STAGE = {
  REQUEST: 'request',
  VERIFY: 'verify',
};

export const RECOVERY_CODE_LENGTH = 6;
export const RECOVERY_MIN_PASSWORD_LENGTH = 6;
export const RECOVERY_CODE_TTL_MINUTES = 15;

/** SMTP на стенде может отвечать 130+ с; без повторных запросов. */
export const RECOVERY_TIMEOUT_MS = 180000;
export const RECOVERY_NETWORK_RETRIES = 0;

export function pickServerMessage(data, fallback) {
  const msg = data?.message;
  return typeof msg === 'string' && msg.trim() ? msg.trim() : fallback;
}
