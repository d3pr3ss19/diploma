import { beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.fn();

vi.mock('./http', () => ({
  http: {
    post: postMock
  }
}));

import { login, logout, refresh } from './auth';

describe('api/auth', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('calls /auth/login with payload and returns response data', async () => {
    const response = {
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 'u1', email: 'operator@kp.local', role: 'OPERATOR' as const }
    };
    postMock.mockResolvedValue({ data: response });

    const result = await login({ email: 'operator@kp.local', password: 'password123' });

    expect(postMock).toHaveBeenCalledWith('/auth/login', {
      email: 'operator@kp.local',
      password: 'password123'
    });
    expect(result).toEqual(response);
  });

  it('calls /auth/refresh with refresh token and returns access token', async () => {
    postMock.mockResolvedValue({ data: { accessToken: 'new-access' } });

    const result = await refresh({ refreshToken: 'refresh-token' });

    expect(postMock).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'refresh-token' });
    expect(result).toEqual({ accessToken: 'new-access' });
  });

  it('calls /auth/logout and returns success payload', async () => {
    postMock.mockResolvedValue({ data: { success: true } });

    const result = await logout({ refreshToken: 'refresh-token' });

    expect(postMock).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'refresh-token' });
    expect(result).toEqual({ success: true });
  });
});
