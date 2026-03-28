import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearAuth, readAuth, updateAccessToken } from '../app/auth-storage';

const API_BASE_URL = 'http://localhost:3000/api/v1';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

let refreshPromise: Promise<string | null> | null = null;

export function shouldSkipAutoRefresh(url?: string): boolean {
  if (!url) {
    return false;
  }

  const normalized = url.replace(API_BASE_URL, '');
  return normalized.startsWith('/auth/login') || normalized.startsWith('/auth/refresh') || normalized.startsWith('/auth/logout');
}

async function requestAccessTokenRefresh(): Promise<string | null> {
  const auth = readAuth();
  if (!auth?.refreshToken) {
    return null;
  }

  try {
    const { data } = await axios.post<{ accessToken: string }>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken: auth.refreshToken },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!data?.accessToken) {
      return null;
    }

    updateAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

http.interceptors.request.use((config) => {
  const token = readAuth()?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (status !== 401 || !originalRequest || originalRequest._retry || shouldSkipAutoRefresh(originalRequest.url)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = requestAccessTokenRefresh().finally(() => {
        refreshPromise = null;
      });
    }

    const newAccessToken = await refreshPromise;
    if (!newAccessToken) {
      clearAuth();
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

    return http(originalRequest);
  }
);
