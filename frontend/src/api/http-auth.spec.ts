import { describe, expect, it } from 'vitest';
import { shouldSkipAutoRefresh } from './http';

describe('api/http auto-refresh helpers', () => {
  it('skips auto-refresh for auth endpoints', () => {
    expect(shouldSkipAutoRefresh('/auth/login')).toBe(true);
    expect(shouldSkipAutoRefresh('/auth/refresh')).toBe(true);
    expect(shouldSkipAutoRefresh('/auth/logout')).toBe(true);
  });

  it('skips auto-refresh for absolute auth endpoint urls', () => {
    expect(shouldSkipAutoRefresh('http://localhost:3000/api/v1/auth/login')).toBe(true);
    expect(shouldSkipAutoRefresh('http://localhost:3000/api/v1/auth/refresh')).toBe(true);
  });

  it('allows auto-refresh attempts for protected business endpoints', () => {
    expect(shouldSkipAutoRefresh('/requests')).toBe(false);
    expect(shouldSkipAutoRefresh('/subscribers')).toBe(false);
  });

  it('does not skip when url is missing', () => {
    expect(shouldSkipAutoRefresh(undefined)).toBe(false);
  });
});
