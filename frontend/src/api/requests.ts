import { http } from './http';
import type { ServiceRequest } from '../types/requests';

export type CreateRequestPayload = {
  accountId: string;
  title: string;
  description: string;
  category: 'ACCIDENT' | 'COMPLAINT' | 'QUESTION';
  assignedToUserId?: string;
};

export async function getRequests(): Promise<ServiceRequest[]> {
  const { data } = await http.get<ServiceRequest[]>('/requests');
  return data;
}

export async function createRequest(payload: CreateRequestPayload): Promise<ServiceRequest> {
  const { data } = await http.post<ServiceRequest>('/requests', payload);
  return data;
}
