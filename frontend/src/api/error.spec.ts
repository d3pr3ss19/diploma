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
    const error = { response: { data: { message: ['Ошибка валидации'] } } };
    expect(extractApiErrorMessage(error, 'fallback')).toBe('Ошибка валидации');
  });

  it('uses network specific message for ERR_NETWORK', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = { code: 'ERR_NETWORK', response: { data: {} } };
    expect(extractApiErrorMessage(error, 'fallback')).toContain('Нет соединения с backend');
  });
});
