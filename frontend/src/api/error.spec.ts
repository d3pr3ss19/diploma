import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { extractApiErrorMessage } from './error';

type ErrorData = {
  message?: string | string[];
  error?: string;
};

function createAxiosError(data: ErrorData, code?: string): AxiosError<ErrorData> {
  const response: AxiosResponse<ErrorData> = {
    data,
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: {} as AxiosResponse<ErrorData>['config'],
  };

  return new AxiosError('Request failed', code, {} as never, undefined, response);
}

describe('extractApiErrorMessage', () => {
  it('returns fallback for non-axios errors', () => {
    expect(extractApiErrorMessage(new Error('x'), 'fallback')).toBe('fallback');
  });

  it('uses first message from array payload', () => {
    const error = createAxiosError({ message: ['Ошибка валидации', 'Второе сообщение'] });

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Ошибка валидации');
  });

  it('uses message string from payload', () => {
    const error = createAxiosError({ message: 'Ошибка авторизации' });

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Ошибка авторизации');
  });

  it('uses error string from payload when message is absent', () => {
    const error = createAxiosError({ error: 'Неверные данные' });

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Неверные данные');
  });

  it('uses network specific message for ERR_NETWORK', () => {
    const error = createAxiosError({}, 'ERR_NETWORK');

    expect(extractApiErrorMessage(error, 'fallback')).toContain('Нет соединения с backend');
  });

  it('returns fallback when axios payload has no readable fields', () => {
    const error = createAxiosError({});

    expect(extractApiErrorMessage(error, 'fallback')).toBe('fallback');
  });
});
