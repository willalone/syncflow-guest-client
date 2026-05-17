import { logger } from './logger';

describe('logger', () => {
  test('warn logs only in __DEV__', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('test');
    if (__DEV__) {
      expect(spy).toHaveBeenCalledWith('test');
    } else {
      expect(spy).not.toHaveBeenCalled();
    }
    spy.mockRestore();
  });
});
