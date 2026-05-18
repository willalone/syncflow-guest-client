import { useCallback, useRef, useState } from 'react';
import {
  RECOVERY_CODE_LENGTH,
  RECOVERY_CODE_TTL_MINUTES,
  RECOVERY_MIN_PASSWORD_LENGTH,
  RECOVERY_STAGE,
  pickServerMessage,
} from '../constants/passwordRecovery';
import { isValidEmailForSyncflow, normalizeEmailForApi } from '../utils/inputMasks';
import {
  messageForRecoveryConfirmError,
  messageForRecoveryRequestError,
} from '../utils/passwordRecoveryErrors';

const CODE_PATTERN = new RegExp(`^\\d{${RECOVERY_CODE_LENGTH}}$`);

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
          `Код из ${RECOVERY_CODE_LENGTH} цифр отправлен на почту. Введите его в течение ${RECOVERY_CODE_TTL_MINUTES} мин (срок действия кода, не время доставки письма).`,
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
