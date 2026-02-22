import axios from 'axios';

type BackendErrorPayload = {
  message?: string | string[];
  error?: string;
};

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data as BackendErrorPayload | string | undefined;

  if (typeof data === 'string' && data.trim().length > 0) {
    return data;
  }

  if (Array.isArray(data?.message) && data.message.length > 0) {
    return data.message[0];
  }

  if (typeof data?.message === 'string' && data.message.trim().length > 0) {
    return data.message;
  }

  if (typeof data?.error === 'string' && data.error.trim().length > 0) {
    return data.error;
  }

  if (error.code === 'ERR_NETWORK') {
    return 'Нет соединения с backend (проверьте, что сервер запущен на localhost:3000).';
  }

  return fallback;
}
