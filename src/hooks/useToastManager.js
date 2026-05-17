import React from 'react';

const TOAST_DURATION_MS = 2600;

export function useToastManager() {
  const [toast, setToast] = React.useState({ visible: false, type: 'success', message: '' });
  const toastHideTimerRef = React.useRef(null);

  const showRawToast = React.useCallback((type, message) => {
    if (toastHideTimerRef.current) {
      clearTimeout(toastHideTimerRef.current);
      toastHideTimerRef.current = null;
    }
    setToast({ visible: true, type, message: String(message || '') });
    toastHideTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
      toastHideTimerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  React.useEffect(
    () => () => {
      if (toastHideTimerRef.current) {
        clearTimeout(toastHideTimerRef.current);
        toastHideTimerRef.current = null;
      }
    },
    []
  );

  return { toast, showRawToast };
}
