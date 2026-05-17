import React from 'react';
import { runtimeConfig } from '../config/runtimeConfig';
import { subscribeNetworkConnection } from '../services/syncflowHttp';

const RECOVERY_CHECK_MS = 3500;
const TRANSPORT_PATTERN =
  /проблема с сетью|network request failed|failed to fetch|сервер отвечает слишком долго|timed out|load failed|соединение/i;

export function useNetworkRecovery(showRawToast) {
  const connectionDownRef = React.useRef(false);
  const recoveryCheckTimerRef = React.useRef(null);

  const stopRecoveryCheck = React.useCallback(() => {
    if (!recoveryCheckTimerRef.current) return;
    clearInterval(recoveryCheckTimerRef.current);
    recoveryCheckTimerRef.current = null;
  }, []);

  const startRecoveryCheck = React.useCallback(() => {
    if (recoveryCheckTimerRef.current) return;
    const probeUrl = `${runtimeConfig.apiBaseUrl.replace(/\/+$/, '')}/menu/client`;
    recoveryCheckTimerRef.current = setInterval(async () => {
      if (!connectionDownRef.current) {
        stopRecoveryCheck();
        return;
      }
      try {
        await fetch(probeUrl, { method: 'GET' });
        connectionDownRef.current = false;
        showRawToast('success', 'Соединение восстановлено');
        stopRecoveryCheck();
      } catch {
        // keep polling while transport is down
      }
    }, RECOVERY_CHECK_MS);
  }, [showRawToast, stopRecoveryCheck]);

  const showToast = React.useCallback(
    (type, message) => {
      const rawMessage = String(message || '');
      const isTransportIssue = type === 'error' && TRANSPORT_PATTERN.test(rawMessage.toLowerCase());

      if (isTransportIssue) {
        if (!connectionDownRef.current) {
          connectionDownRef.current = true;
          startRecoveryCheck();
          showRawToast('error', 'Соединение потеряно');
        }
        return;
      }

      showRawToast(type, rawMessage);
    },
    [showRawToast, startRecoveryCheck]
  );

  React.useEffect(() => {
    const unsubscribe = subscribeNetworkConnection((state) => {
      if (state === 'down') {
        showToast('error', 'Соединение потеряно');
        return;
      }
      if (state === 'restored') {
        if (!connectionDownRef.current) return;
        connectionDownRef.current = false;
        stopRecoveryCheck();
        showRawToast('success', 'Соединение восстановлено');
      }
    });
    return unsubscribe;
  }, [showRawToast, showToast, stopRecoveryCheck]);

  React.useEffect(
    () => () => {
      stopRecoveryCheck();
    },
    [stopRecoveryCheck]
  );

  return { showToast };
}
