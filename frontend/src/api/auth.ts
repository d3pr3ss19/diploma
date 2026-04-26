import { http } from './http';
import type { LoginRequest, LoginResponse, LogoutRequest, RefreshRequest, RefreshResponse, UserRole } from '../types/auth';

export type AuditLogSection = 'USERS' | 'SUBSCRIBERS' | 'REQUESTS' | 'BILLING';

export type AuditLogItem = {
  id: string;
  action: string;
  createdAt: string;
  details?: Record<string, unknown>;
  actorUser?: { id: number; email: string } | null;
  targetUser?: { id: number; email: string } | null;
};

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

export async function deactivateUser(userId: number): Promise<{ success: boolean }> {
  const { data } = await http.post<{ success: boolean }>(`/auth/users/${userId}/deactivate`);
  return data;
}

export async function activateUser(userId: number): Promise<{ success: boolean }> {
  const { data } = await http.post<{ success: boolean }>(`/auth/users/${userId}/activate`);
  return data;
}

export async function deleteUser(userId: number): Promise<{ success: boolean }> {
  const { data } = await http.delete<{ success: boolean }>(`/auth/users/${userId}`);
  return data;
}

export async function resetUserPassword(userId: number): Promise<{ success: boolean; password: string }> {
  const { data } = await http.post<{ success: boolean; password: string }>(`/auth/users/${userId}/reset-password`);
  return data;
}

export async function updateUserRole(userId: number, role: UserRole): Promise<{ success: boolean }> {
  const { data } = await http.patch<{ success: boolean }>(`/auth/users/${userId}/role`, { role });
  return data;
}

export async function updateMyProfile(email: string, fullName: string, region?: string): Promise<LoginResponse['user']> {
  const { data } = await http.patch<{ success: boolean; user: LoginResponse['user'] }>('/auth/me', { email, fullName, region });
  return data.user;
}

export async function createSignupRequest(payload: {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  apartment?: string;
  region: string;
}) {
  const { data } = await http.post('/auth/signup-requests', payload);
  return data;
}

export async function listSignupRequests(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
  const { data } = await http.get('/auth/signup-requests', { params: status ? { status } : undefined });
  return data as Array<Record<string, unknown>>;
}

export async function approveSignupRequest(id: number, comment?: string) {
  const { data } = await http.post(`/auth/signup-requests/${id}/approve`, { comment });
  return data;
}

export async function rejectSignupRequest(id: number, comment?: string) {
  const { data } = await http.post(`/auth/signup-requests/${id}/reject`, { comment });
  return data;
}

export async function getAuditLogs(section?: AuditLogSection): Promise<AuditLogItem[]> {
  const { data } = await http.get<AuditLogItem[]>('/auth/audit-logs', {
    params: section ? { section } : undefined,
  });
  return data;
}
