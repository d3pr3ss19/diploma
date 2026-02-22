import axios from 'axios';

type BackendErrorPayload = {
  message?: string | string[];
  error?: string;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isGenericAxiosMessage(message: string): boolean {
  return (
    message === 'Request failed' ||
    message === 'Network Error' ||
    message.startsWith('Request failed with status code')
  );
}


function statusFallbackMessage(status: number | undefined): string | null {
  if (status === 401) {
    return 'Сессия истекла. Войдите в систему заново.';
  }

  if (status === 403) {
    return 'Недостаточно прав для выполнения операции.';
  }

  if (status === 404) {
    return 'Запрошенный ресурс не найден.';
  }

  if (typeof status === 'number' && status >= 500) {
    return 'Внутренняя ошибка сервера. Попробуйте позже.';
  }

  return null;
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data as BackendErrorPayload | string | undefined;

  const plainMessage = asNonEmptyString(data);
  if (plainMessage) {
    return plainMessage;
  }

  if (Array.isArray(data?.message)) {
    const firstReadableMessage = data.message.map(asNonEmptyString).find((message) => message !== null);
    if (firstReadableMessage) {
      return firstReadableMessage;
    }
  }

  const detailedMessage = asNonEmptyString(data?.message);
  if (detailedMessage) {
    return detailedMessage;
  }

  const errorFieldMessage = asNonEmptyString(data?.error);
  if (errorFieldMessage) {
    return errorFieldMessage;
  }

  if (error.code === 'ERR_NETWORK') {
    return 'Нет соединения с backend (проверьте, что сервер запущен на localhost:3000).';
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'Сервер слишком долго отвечает. Попробуйте ещё раз.';
  }

  const statusMessage = statusFallbackMessage(error.response?.status);
  if (statusMessage) {
    return statusMessage;
  }

  const axiosMessage = asNonEmptyString(error.message);
  if (axiosMessage && !isGenericAxiosMessage(axiosMessage)) {
    return axiosMessage;
  }

  return fallback;
}
