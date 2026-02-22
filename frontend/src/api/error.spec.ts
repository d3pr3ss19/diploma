import type { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { extractApiErrorMessage } from './error';

function createAxiosError(overrides: Partial<AxiosError> = {}): AxiosError {
  return {
    name: 'AxiosError',
    message: 'Request failed',
    config: {} as AxiosError['config'],
    isAxiosError: true,
    toJSON: () => ({}),
    ...overrides,
  } as AxiosError;
}

describe('extractApiErrorMessage', () => {
  it('returns fallback for non-axios errors', () => {
    expect(extractApiErrorMessage(new Error('x'), 'fallback')).toBe('fallback');
  });

  it('uses first message from array payload', () => {
    const error = createAxiosError({
      response: { data: { message: ['Ошибка валидации', 'Второе сообщение'] } } as AxiosError['response'],
    });

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Ошибка валидации');
  });

  it('uses message string from payload', () => {
    const error = createAxiosError({
      response: { data: { message: 'Ошибка авторизации' } } as AxiosError['response'],
    });

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Ошибка авторизации');
  });

  it('uses error string from payload when message is absent', () => {
    const error = createAxiosError({
      response: { data: { error: 'Неверные данные' } } as AxiosError['response'],
    });

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Неверные данные');
  });

  it('uses network specific message for ERR_NETWORK', () => {
    const error = createAxiosError({
      code: 'ERR_NETWORK',
      response: { data: {} } as AxiosError['response'],
    });

    expect(extractApiErrorMessage(error, 'fallback')).toContain('Нет соединения с backend');
  });

  it('returns fallback when axios payload has no readable fields', () => {
    const error = createAxiosError({
      response: { data: {} } as AxiosError['response'],
    });

    expect(extractApiErrorMessage(error, 'fallback')).toBe('fallback');
  });
});
