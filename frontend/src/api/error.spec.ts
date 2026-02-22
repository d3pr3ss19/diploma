import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { extractApiErrorMessage } from './error';

type ErrorData = {
  message?: string | string[];
  error?: string;
};

function createAxiosError(data: ErrorData | string, code?: string, message = 'Request failed'): AxiosError<ErrorData | string> {
  const response: AxiosResponse<ErrorData | string> = {
    data,
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: {} as AxiosResponse<ErrorData | string>['config'],
  };

  return new AxiosError(message, code, {} as never, undefined, response);
}

describe('extractApiErrorMessage', () => {
  it('returns fallback for non-axios errors', () => {
    expect(extractApiErrorMessage(new Error('x'), 'fallback')).toBe('fallback');
  });

  it('uses plain string response payload', () => {
    const error = createAxiosError('Текстовая ошибка от сервера');

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Текстовая ошибка от сервера');
  });

  it('normalizes plain string response payload with extra spaces', () => {
    const error = createAxiosError('   Текстовая ошибка от сервера   ');

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Текстовая ошибка от сервера');
  });

  it('uses first non-empty message from array payload', () => {
    const error = createAxiosError({ message: ['   ', 'Ошибка валидации', 'Второе сообщение'] });

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Ошибка валидации');
  });

  it('uses message string from payload', () => {
    const error = createAxiosError({ message: 'Ошибка авторизации' });

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Ошибка авторизации');
  });

  it('falls back to error field when message is blank', () => {
    const error = createAxiosError({ message: '   ', error: 'Неверные данные' });

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Неверные данные');
  });

  it('uses network specific message for ERR_NETWORK', () => {
    const error = createAxiosError({}, 'ERR_NETWORK');

    expect(extractApiErrorMessage(error, 'fallback')).toContain('Нет соединения с backend');
  });

  it('uses non-generic axios message when payload is empty', () => {
    const error = createAxiosError({ message: ['  '], error: '   ' }, undefined, 'timeout of 5000ms exceeded');

    expect(extractApiErrorMessage(error, 'fallback')).toBe('timeout of 5000ms exceeded');
  });

  it('returns fallback when axios payload is empty and axios message is generic', () => {
    const error = createAxiosError({ message: ['  '], error: '   ' });

    expect(extractApiErrorMessage(error, 'fallback')).toBe('fallback');
  });

  it('uses fallback when axios message and payload are blank', () => {
    const error = new AxiosError('   ', undefined, {} as never, undefined, {
      data: { message: ['  '], error: '   ' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as AxiosResponse<ErrorData>['config'],
    });

    expect(extractApiErrorMessage(error, 'fallback')).toBe('fallback');
  });
});
