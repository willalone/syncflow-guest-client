import { act, renderHook } from '../test/renderHook';
import { useToastManager } from './useToastManager';

describe('useToastManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('showRawToast sets visible and hides after timeout', () => {
    const { result } = renderHook(() => useToastManager());
    act(() => {
      result.current.showRawToast('success', 'Готово');
    });
    expect(result.current.toast).toEqual({
      visible: true,
      type: 'success',
      message: 'Готово',
    });
    act(() => {
      jest.advanceTimersByTime(2600);
    });
    expect(result.current.toast.visible).toBe(false);
  });
});
