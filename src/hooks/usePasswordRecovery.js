import { useCallback, useRef, useState } from 'react';
import {
  RECOVERY_CODE_LENGTH,
  RECOVERY_CODE_TTL_MINUTES,
  RECOVERY_MIN_PASSWORD_LENGTH,
  RECOVERY_STAGE,
  pickServerMessage,
} from '../constants/passwordRecovery';
import { isValidEmailForSyncflow, normalizeEmailForApi } from '../utils/inputMasks';

const CODE_PATTERN = new RegExp(`^\\d{${RECOVERY_CODE_LENGTH}}$`);

function messageForRecoveryRequestError(error) {
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
    return 'Письмо сейчас не удалось отправить — временные неполадки на стороне ресторана. Попробуйте через несколько минут.';
  }
  if (status >= 500) {
    return 'Сервис ресторана временно недоступен. Попробуйте чуть позже или обратитесь к администратору зала.';
  }
  return error?.message || 'Не удалось отправить код. Попробуйте ещё раз.';
}

function messageForRecoveryConfirmError(error) {
  const status = Number(error?.status || 0);
  if (error?.name === 'NetworkTimeoutError') {
    return 'Ответ пришёл слишком долго. Проверьте интернет и повторите — если пароль уже сменился, можно сразу войти.';
  }
  if (error?.name === 'NetworkTransportError') {
    return 'Не получилось связаться с сервером. Проверьте интернет и повторите попытку.';
  }
  if (status === 401) {
    return `Код неверный или истёк (действует ${RECOVERY_CODE_TTL_MINUTES} минут). Запросите новый код.`;
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

/**
 * Состояние и сценарии модалки «Забыли пароль» (SyncFlow reset-password).
 */
export function usePasswordRecovery({ requestPasswordRecovery, confirmPasswordRecovery, onLoginPasswordsCleared }) {
  const [forgotVisible, setForgotVisible] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryStage, setRecoveryStage] = useState(RECOVERY_STAGE.REQUEST);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  const userDismissedRef = useRef(false);
  const abortRef = useRef(null);

  const resetModal = useCallback(() => {
    setRecoveryEmail('');
    setRecoveryCode('');
    setRecoveryPassword('');
    setRecoveryConfirmPassword('');
    setRecoveryError('');
    setRecoverySuccess('');
    setRecoveryStage(RECOVERY_STAGE.REQUEST);
    setRecoveryLoading(false);
  }, []);

  const closeForgotModal = useCallback(() => {
    userDismissedRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    setForgotVisible(false);
    resetModal();
  }, [resetModal]);

  const openWithEmailHint = useCallback((emailHint) => {
    userDismissedRef.current = false;
    setRecoveryEmail(String(emailHint || '').trim());
    setRecoveryCode('');
    setRecoveryPassword('');
    setRecoveryConfirmPassword('');
    setRecoveryError('');
    setRecoverySuccess('');
    setRecoveryStage(RECOVERY_STAGE.REQUEST);
    setForgotVisible(true);
  }, []);

  const requestRecoveryCode = useCallback(async () => {
    const nextEmail = normalizeEmailForApi(recoveryEmail);
    if (!isValidEmailForSyncflow(recoveryEmail)) {
      setRecoveryError(
        'Проверьте email: только латиница, без лишних пробелов (особенно если копировали из мессенджера).',
      );
      return;
    }
    userDismissedRef.current = false;
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      setRecoveryLoading(true);
      setRecoveryError('');
      setRecoverySuccess('');
      setRecoveryCode('');
      setRecoveryPassword('');
      setRecoveryConfirmPassword('');
      const response = await requestPasswordRecovery({ email: nextEmail, signal: ac.signal });
      if (userDismissedRef.current) return;
      setRecoveryStage(RECOVERY_STAGE.VERIFY);
      setRecoverySuccess(
        pickServerMessage(
          response,
          `Код из ${RECOVERY_CODE_LENGTH} цифр отправлен на почту. Действует ${RECOVERY_CODE_TTL_MINUTES} минут.`,
        ),
      );
    } catch (error) {
      if (userDismissedRef.current) return;
      setRecoveryError(messageForRecoveryRequestError(error));
    } finally {
      abortRef.current = null;
      if (!userDismissedRef.current) {
        setRecoveryLoading(false);
      }
    }
  }, [recoveryEmail, requestPasswordRecovery]);

  const submitRecovery = useCallback(async () => {
    const nextEmail = normalizeEmailForApi(recoveryEmail);
    if (!isValidEmailForSyncflow(recoveryEmail)) {
      setRecoveryError(
        'Проверьте email: только латиница, без лишних пробелов (особенно если копировали из мессенджера).',
      );
      return;
    }
    if (!CODE_PATTERN.test(recoveryCode)) {
      setRecoveryError(`Введите ${RECOVERY_CODE_LENGTH}-значный код из письма.`);
      return;
    }
    if (!recoveryPassword || recoveryPassword.length < RECOVERY_MIN_PASSWORD_LENGTH) {
      setRecoveryError(`Новый пароль — минимум ${RECOVERY_MIN_PASSWORD_LENGTH} символов.`);
      return;
    }
    if (recoveryPassword !== recoveryConfirmPassword) {
      setRecoveryError('Пароли не совпадают.');
      return;
    }
    userDismissedRef.current = false;
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      setRecoveryLoading(true);
      setRecoveryError('');
      setRecoverySuccess('');
      const response = await confirmPasswordRecovery({
        email: nextEmail,
        code: recoveryCode,
        newPassword: recoveryPassword,
        signal: ac.signal,
      });
      if (userDismissedRef.current) return;
      setRecoverySuccess(pickServerMessage(response, 'Пароль обновлён. Войдите с новым паролем по логину.'));
      onLoginPasswordsCleared?.();
      setTimeout(() => {
        closeForgotModal();
      }, 700);
    } catch (error) {
      if (userDismissedRef.current) return;
      setRecoveryError(messageForRecoveryConfirmError(error));
    } finally {
      abortRef.current = null;
      if (!userDismissedRef.current) {
        setRecoveryLoading(false);
      }
    }
  }, [
    recoveryEmail,
    recoveryCode,
    recoveryPassword,
    recoveryConfirmPassword,
    confirmPasswordRecovery,
    onLoginPasswordsCleared,
    closeForgotModal,
  ]);

  return {
    forgotVisible,
    recoveryEmail,
    setRecoveryEmail,
    recoveryCode,
    setRecoveryCode,
    recoveryPassword,
    setRecoveryPassword,
    recoveryConfirmPassword,
    setRecoveryConfirmPassword,
    recoveryLoading,
    recoveryStage,
    recoveryError,
    recoverySuccess,
    openWithEmailHint,
    closeForgotModal,
    requestRecoveryCode,
    submitRecovery,
  };
}
