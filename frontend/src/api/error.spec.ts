import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractApiErrorMessage } from './error';

describe('extractApiErrorMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns fallback for non-axios errors', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);

    expect(extractApiErrorMessage(new Error('x'), 'fallback')).toBe('fallback');
  });

  it('uses first message from array payload', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = { response: { data: { message: ['Ошибка валидации', 'Второе сообщение'] } } };

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Ошибка валидации');
  });

  it('uses message string from payload', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = { response: { data: { message: 'Ошибка авторизации' } } };

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Ошибка авторизации');
  });

  it('uses error string from payload when message is absent', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = { response: { data: { error: 'Неверные данные' } } };

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Неверные данные');
  });

  it('uses network specific message for ERR_NETWORK', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = { code: 'ERR_NETWORK', response: { data: {} } };

    expect(extractApiErrorMessage(error, 'fallback')).toContain('Нет соединения с backend');
  });

  it('returns fallback when axios payload has no readable fields', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = { response: { data: {} } };

    expect(extractApiErrorMessage(error, 'fallback')).toBe('fallback');
  });
});
