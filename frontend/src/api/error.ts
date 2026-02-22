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

  const axiosMessage = asNonEmptyString(error.message);
  if (axiosMessage && !isGenericAxiosMessage(axiosMessage)) {
    return axiosMessage;
  }

  return fallback;
}
