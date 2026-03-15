import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readAuth, writeAuth } from '../app/auth-storage';
import type { LoginResponse } from '../types/auth';
import { http, shouldSkipAutoRefresh } from './http';

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    }
  };
}

function seedAuth(accessToken = 'old-access'): LoginResponse {
  const auth: LoginResponse = {
    accessToken,
    refreshToken: 'refresh-1',
    user: {
      id: 'u1',
      email: 'operator@kp.local',
      role: 'OPERATOR'
    }
  };
  writeAuth(auth);
  return auth;
}

function createUnauthorizedError(url: string): AxiosError {
  const config = {
    url,
    method: 'get',
    headers: {}
  } as unknown as InternalAxiosRequestConfig;

  return new AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', config, undefined, {
    data: {},
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config
  } as AxiosResponse);
}

describe('api/http auto-refresh helpers', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
  });

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

  it('updates auth access token and retries request after 401', async () => {
    seedAuth();
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'new-access' } });

    const adapterSpy = vi.fn(async (config: InternalAxiosRequestConfig) => ({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    }));

    const oldAdapter = http.defaults.adapter;
    http.defaults.adapter = adapterSpy;

    const rejected = (http.interceptors.response as unknown as { handlers: Array<{ rejected: (error: AxiosError) => Promise<unknown> }> }).handlers[0].rejected;

    const result = (await rejected(createUnauthorizedError('/requests'))) as AxiosResponse;

    expect(postSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/refresh',
      { refreshToken: 'refresh-1' },
      { headers: { 'Content-Type': 'application/json' } }
    );
    expect(adapterSpy).toHaveBeenCalled();
    expect(result.status).toBe(200);
    expect(readAuth()?.accessToken).toBe('new-access');

    http.defaults.adapter = oldAdapter;
    postSpy.mockRestore();
  });

  it('clears auth when refresh fails after 401', async () => {
    seedAuth();
    const postSpy = vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh failed'));

    const rejected = (http.interceptors.response as unknown as { handlers: Array<{ rejected: (error: AxiosError) => Promise<unknown> }> }).handlers[0].rejected;

    await expect(rejected(createUnauthorizedError('/requests'))).rejects.toBeInstanceOf(AxiosError);
    expect(readAuth()).toBeNull();

    postSpy.mockRestore();
  });
});
