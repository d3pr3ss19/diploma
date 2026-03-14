import { http } from './http';
import type { LoginRequest, LoginResponse, RefreshRequest, RefreshResponse } from '../types/auth';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function refresh(payload: RefreshRequest): Promise<RefreshResponse> {
  const { data } = await http.post<RefreshResponse>('/auth/refresh', payload);
  return data;
}

export async function logout(): Promise<{ success: boolean }> {
  const { data } = await http.post<{ success: boolean }>('/auth/logout');
  return data;
}
