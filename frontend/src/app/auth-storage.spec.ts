import { beforeEach, describe, expect, it } from 'vitest';
import { clearAuth, readAuth, updateAccessToken, writeAuth } from './auth-storage';

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

describe('auth-storage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
    clearAuth();
  });

  it('returns null when storage is empty', () => {
    expect(readAuth()).toBeNull();
  });

  it('writes and reads auth payload', () => {
    const auth = {
      accessToken: 'access',
      refreshToken: 'refresh',
      user: { id: 'u1', email: 'u@e.com', role: 'OPERATOR' as const }
    };

    writeAuth(auth);

    expect(readAuth()).toEqual(auth);
  });

  it('overwrites existing auth payload', () => {
    writeAuth({
      accessToken: 'old',
      refreshToken: 'old-refresh',
      user: { id: 'u1', email: 'old@e.com', role: 'OPERATOR' as const }
    });

    const next = {
      accessToken: 'new',
      refreshToken: 'new-refresh',
      user: { id: 'u2', email: 'new@e.com', role: 'ADMIN' as const }
    };

    writeAuth(next);

    expect(readAuth()).toEqual(next);
  });

  it('updates access token and keeps refresh/user data', () => {
    writeAuth({
      accessToken: 'old-access',
      refreshToken: 'refresh',
      user: { id: 'u1', email: 'u@e.com', role: 'ADMIN' as const }
    });

    const updated = updateAccessToken('new-access');

    expect(updated).toBe(true);
    expect(readAuth()).toEqual({
      accessToken: 'new-access',
      refreshToken: 'refresh',
      user: { id: 'u1', email: 'u@e.com', role: 'ADMIN' }
    });
  });

  it('returns false on access-token update when auth is missing', () => {
    expect(updateAccessToken('new-access')).toBe(false);
    expect(readAuth()).toBeNull();
  });

  it('clears auth payload', () => {
    writeAuth({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: { id: 'u1', email: 'u@e.com', role: 'ADMIN' as const }
    });

    clearAuth();

    expect(readAuth()).toBeNull();
  });

  it('returns null for invalid JSON and clears storage', () => {
    localStorage.setItem('diploma-auth', '{invalid json');

    expect(readAuth()).toBeNull();
    expect(localStorage.getItem('diploma-auth')).toBeNull();
  });
});
