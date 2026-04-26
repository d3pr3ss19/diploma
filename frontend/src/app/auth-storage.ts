import type { LoginResponse } from '../types/auth';

const AUTH_STORAGE_KEY = 'diploma-auth';

export function readAuth(): LoginResponse | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LoginResponse;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function writeAuth(auth: LoginResponse): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function updateAccessToken(accessToken: string): boolean {
  const current = readAuth();
  if (!current) {
    return false;
  }

  writeAuth({
    ...current,
    accessToken
  });

  return true;
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function updateStoredUser(user: LoginResponse['user']): boolean {
  const current = readAuth();
  if (!current) {
    return false;
  }

  writeAuth({
    ...current,
    user,
  });

  return true;
}
