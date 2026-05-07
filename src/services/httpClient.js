const DEFAULT_TIMEOUT = 6000;
const DEFAULT_RETRIES = 1;

function toUserMessage(status, rawBody) {
  try {
    const parsed = rawBody ? JSON.parse(rawBody) : null;
    const message = parsed?.error?.message || parsed?.message;
    if (message) {
      const text = String(message);
      if (/foreign key constraint|ER_NO_REFERENCED_ROW|Cannot add or update a child row/i.test(text)) {
        return 'Не удалось сохранить данные. Проверьте вход в аккаунт и попробуйте снова.';
      }
      return text;
    }
  } catch {
    // no-op: keep fallback message below
  }

  if (status === 400) return 'Проверьте корректность введенных данных.';
  if (status === 401) return 'Требуется повторный вход в аккаунт.';
  if (status === 403) return 'Недостаточно прав для выполнения операции.';
  if (status === 404) return 'Запрошенные данные не найдены.';
  if (status === 409) return 'Действие недоступно: проверьте время, стол или повторите позже.';
  if (status >= 500) return 'Сервер временно недоступен. Попробуйте чуть позже.';
  return 'Не удалось выполнить операцию. Попробуйте еще раз.';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function request(url, options = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelayMs = 300,
    ...fetchOptions
  } = options;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(fetchOptions.headers || {}),
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text();
        const userMessage = toUserMessage(response.status, body);
        const error = new Error(userMessage);
        error.name = 'HttpClientError';
        error.status = response.status;
        error.rawBody = body || '';
        throw error;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
  }

  throw lastError;
}
