import {
  RECOVERY_CODE_LENGTH,
  RECOVERY_CODE_TTL_MINUTES,
  RECOVERY_MIN_PASSWORD_LENGTH,
} from '../constants/passwordRecovery';

export function messageForRecoveryRequestError(error) {
  const status = Number(error?.status || 0);
  if (error?.name === 'NetworkTimeoutError') {
    return (
      'Сервер не ответил вовремя — подтверждения отправки кода нет. ' +
      'Подождите и нажмите «Отправить код» ещё раз.'
    );
  }
  if (status === 400) {
    return 'Проверьте формат email и повторите запрос.';
  }
  if (error?.name === 'NetworkTransportError') {
    return 'Не получилось связаться с сервером. Проверьте интернет и повторите попытку.';
  }
  if (status === 404) {
    return 'Мы не нашли аккаунт с таким email. Проверьте адрес или укажите тот, что вводили при регистрации.';
  }
  if (status === 409) {
    return (
      error?.message ||
      'Не удалось отправить письмо (ошибка почты на сервере). Попробуйте позже или обратитесь к администратору зала.'
    );
  }
  if (status >= 500) {
    return 'Сервис ресторана временно недоступен. Попробуйте чуть позже или обратитесь к администратору зала.';
  }
  return error?.message || 'Не удалось отправить код. Попробуйте ещё раз.';
}

export function messageForRecoveryConfirmError(error) {
  const status = Number(error?.status || 0);
  if (error?.name === 'NetworkTimeoutError') {
    return 'Ответ пришёл слишком долго. Проверьте интернет и повторите — если пароль уже сменился, можно сразу войти.';
  }
  if (error?.name === 'NetworkTransportError') {
    return 'Не получилось связаться с сервером. Проверьте интернет и повторите попытку.';
  }
  if (status === 401) {
    return `Код неверный или истёк (срок действия ${RECOVERY_CODE_TTL_MINUTES} мин с отправки). Запросите новый код.`;
  }
  if (status === 404) {
    return 'Аккаунт с этим email не найден. Проверьте адрес и попробуйте снова.';
  }
  if (status === 400) {
    return `Проверьте код (${RECOVERY_CODE_LENGTH} цифр) и новый пароль (не короче ${RECOVERY_MIN_PASSWORD_LENGTH} символов).`;
  }
  if (status >= 500) {
    return 'Сервис ресторана временно недоступен. Попробуйте чуть позже.';
  }
  return error?.message || 'Не удалось сменить пароль. Попробуйте ещё раз.';
}
