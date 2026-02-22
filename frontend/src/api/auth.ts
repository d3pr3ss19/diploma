import { http } from './http';
import type { LoginRequest, LoginResponse } from '../types/auth';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/auth/login', payload);
  return data;
}
