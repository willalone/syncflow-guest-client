export const logger = {
  warn: (...args) => {
    if (__DEV__) {
      // Keep diagnostics in development, avoid noisy production logs.
      console.warn(...args);
    }
  },
};
