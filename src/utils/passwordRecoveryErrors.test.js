import {
  messageForRecoveryConfirmError,
  messageForRecoveryRequestError,
} from './passwordRecoveryErrors';

describe('passwordRecoveryErrors', () => {
  describe('messageForRecoveryRequestError', () => {
    it('maps timeout and transport', () => {
      expect(messageForRecoveryRequestError({ name: 'NetworkTimeoutError' })).toMatch(/не ответил вовремя/i);
      expect(messageForRecoveryRequestError({ name: 'NetworkTransportError' })).toMatch(/интернет/i);
    });

    it('maps HTTP statuses', () => {
      expect(messageForRecoveryRequestError({ status: 400 })).toMatch(/формат email/i);
      expect(messageForRecoveryRequestError({ status: 404 })).toMatch(/не нашли аккаунт/i);
      expect(messageForRecoveryRequestError({ status: 409, message: 'SMTP down' })).toBe('SMTP down');
      expect(messageForRecoveryRequestError({ status: 500 })).toMatch(/временно недоступен/i);
    });

    it('uses error.message as fallback', () => {
      expect(messageForRecoveryRequestError({ message: 'Custom' })).toBe('Custom');
    });
  });

  describe('messageForRecoveryConfirmError', () => {
    it('maps confirm errors', () => {
      expect(messageForRecoveryConfirmError({ status: 401 })).toMatch(/6-значный|код неверный|15 минут/i);
      expect(messageForRecoveryConfirmError({ status: 400 })).toMatch(/6 цифр/);
      expect(messageForRecoveryConfirmError({ status: 404 })).toMatch(/не найден/i);
    });
  });
});
