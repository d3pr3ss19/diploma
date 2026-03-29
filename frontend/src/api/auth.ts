import { http } from './http';
import type { LoginRequest, LoginResponse, LogoutRequest, RefreshRequest, RefreshResponse } from '../types/auth';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function refresh(payload: RefreshRequest): Promise<RefreshResponse> {
  const { data } = await http.post<RefreshResponse>('/auth/refresh', payload);
  return data;
}

export async function logout(payload: LogoutRequest): Promise<{ success: boolean }> {
  const { data } = await http.post<{ success: boolean }>('/auth/logout', payload);
  return data;
}

export async function deactivateUser(userId: string): Promise<{ success: boolean }> {
  const { data } = await http.post<{ success: boolean }>(`/auth/users/${userId}/deactivate`);
  return data;
}

export async function activateUser(userId: string): Promise<{ success: boolean }> {
  const { data } = await http.post<{ success: boolean }>(`/auth/users/${userId}/activate`);
  return data;
}
