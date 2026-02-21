import { http } from './http';
import type { ServiceRequest } from '../types/requests';

export async function getRequests(): Promise<ServiceRequest[]> {
  const { data } = await http.get<ServiceRequest[]>('/requests');
  return data;
}
