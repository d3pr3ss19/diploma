import { beforeEach, describe, expect, it } from 'vitest';
import { clearAuth, readAuth, writeAuth } from './auth-storage';

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
    },
  };
}

describe('auth-storage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true,
    });
    clearAuth();
  });

  it('writes and reads auth payload', () => {
    const auth = {
      accessToken: 'access',
      refreshToken: 'refresh',
      user: { id: 'u1', email: 'u@e.com', role: 'OPERATOR' as const },
    };

    writeAuth(auth);

    expect(readAuth()).toEqual(auth);
  });

  it('clears auth payload', () => {
    writeAuth({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: { id: 'u1', email: 'u@e.com', role: 'ADMIN' as const },
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
