import {
  RECOVERY_CODE_LENGTH,
  RECOVERY_CODE_TTL_MINUTES,
  RECOVERY_MIN_PASSWORD_LENGTH,
  RECOVERY_NETWORK_RETRIES,
  RECOVERY_STAGE,
  RECOVERY_TIMEOUT_MS,
  pickServerMessage,
} from './passwordRecovery';

/** Контракт API_DOCS.md §2.6 */
describe('passwordRecovery constants', () => {
  it('matches API: 6-digit code, 15 min TTL, password min 6', () => {
    expect(RECOVERY_CODE_LENGTH).toBe(6);
    expect(RECOVERY_CODE_TTL_MINUTES).toBe(15);
    expect(RECOVERY_MIN_PASSWORD_LENGTH).toBe(6);
  });

  it('defines two UI stages', () => {
    expect(RECOVERY_STAGE.REQUEST).toBe('request');
    expect(RECOVERY_STAGE.VERIFY).toBe('verify');
  });

  it('uses long SMTP timeout without retries', () => {
    expect(RECOVERY_TIMEOUT_MS).toBe(180000);
    expect(RECOVERY_NETWORK_RETRIES).toBe(0);
  });
});

describe('pickServerMessage', () => {
  it('uses server message from 200 JSON body', () => {
    expect(pickServerMessage({ message: 'Код отправлен на a@b.ru' }, 'fallback')).toBe(
      'Код отправлен на a@b.ru',
    );
  });

  it('falls back when message missing', () => {
    expect(pickServerMessage({}, 'Запасной текст')).toBe('Запасной текст');
    expect(pickServerMessage(null, 'Запасной текст')).toBe('Запасной текст');
  });
});
