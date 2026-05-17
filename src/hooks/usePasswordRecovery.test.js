import { act, renderHook } from '../test/renderHook';
import { RECOVERY_STAGE } from '../constants/passwordRecovery';
import { usePasswordRecovery } from './usePasswordRecovery';

describe('usePasswordRecovery', () => {
  const requestPasswordRecovery = jest.fn();
  const confirmPasswordRecovery = jest.fn();
  const onLoginPasswordsCleared = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function setup() {
    return renderHook(() =>
      usePasswordRecovery({
        requestPasswordRecovery,
        confirmPasswordRecovery,
        onLoginPasswordsCleared,
      }),
    );
  }

  test('openWithEmailHint pre-fills email and shows modal', () => {
    const { result } = setup();
    act(() => {
      result.current.openWithEmailHint(' user@test.com ');
    });
    expect(result.current.forgotVisible).toBe(true);
    expect(result.current.recoveryEmail).toBe('user@test.com');
    expect(result.current.recoveryStage).toBe(RECOVERY_STAGE.REQUEST);
  });

  test('requestRecoveryCode validates email before API', async () => {
    const { result } = setup();
    act(() => {
      result.current.setRecoveryEmail('not-an-email');
    });
    await act(async () => {
      await result.current.requestRecoveryCode();
    });
    expect(requestPasswordRecovery).not.toHaveBeenCalled();
    expect(result.current.recoveryError).toMatch(/латиница/i);
  });

  test('requestRecoveryCode moves to VERIFY after 200', async () => {
    requestPasswordRecovery.mockResolvedValue({ message: 'Код отправлен' });
    const { result } = setup();
    act(() => {
      result.current.setRecoveryEmail('user@example.com');
    });
    await act(async () => {
      await result.current.requestRecoveryCode();
    });
    expect(requestPasswordRecovery).toHaveBeenCalledWith({
      email: 'user@example.com',
      signal: expect.any(AbortSignal),
    });
    expect(result.current.recoveryStage).toBe(RECOVERY_STAGE.VERIFY);
    expect(result.current.recoverySuccess).toBe('Код отправлен');
  });

  test('submitRecovery validates code and passwords', async () => {
    const { result } = setup();
    act(() => {
      result.current.setRecoveryEmail('user@example.com');
      result.current.setRecoveryCode('12');
      result.current.setRecoveryPassword('short');
      result.current.setRecoveryConfirmPassword('short');
    });
    await act(async () => {
      await result.current.submitRecovery();
    });
    expect(confirmPasswordRecovery).not.toHaveBeenCalled();
    expect(result.current.recoveryError).toMatch(/6-значный|минимум/i);
  });

  test('submitRecovery closes modal after success', async () => {
    confirmPasswordRecovery.mockResolvedValue({ message: 'OK' });
    const { result } = setup();
    act(() => {
      result.current.setRecoveryEmail('user@example.com');
      result.current.setRecoveryCode('123456');
      result.current.setRecoveryPassword('secret12');
      result.current.setRecoveryConfirmPassword('secret12');
    });
    await act(async () => {
      await result.current.submitRecovery();
    });
    expect(onLoginPasswordsCleared).toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(result.current.forgotVisible).toBe(false);
  });

  test('closeForgotModal aborts in-flight request', async () => {
    let rejectRequest;
    requestPasswordRecovery.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject;
        }),
    );
    const { result } = setup();
    act(() => {
      result.current.setRecoveryEmail('user@example.com');
    });
    let requestPromise;
    act(() => {
      requestPromise = result.current.requestRecoveryCode();
    });
    act(() => {
      result.current.closeForgotModal();
    });
    await act(async () => {
      rejectRequest?.({ name: 'AbortError' });
      await requestPromise.catch(() => {});
    });
    expect(result.current.forgotVisible).toBe(false);
    expect(result.current.recoveryLoading).toBe(false);
  });
});
