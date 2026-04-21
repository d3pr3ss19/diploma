import { http } from './http';
import type { ServiceRequest } from '../types/requests';

export type CreateRequestPayload = {
  accountId: string;
  title: string;
  description: string;
  category: 'ACCIDENT' | 'COMPLAINT' | 'QUESTION';
  assignedToUserId?: string;
};

export type UpdateRequestPayload = Partial<{
  title: string;
  description: string;
  category: 'ACCIDENT' | 'COMPLAINT' | 'QUESTION';
  status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'REJECTED';
  assignedToUserId: string | null;
  comment: string;
}>;

export async function getRequests(): Promise<ServiceRequest[]> {
  const { data } = await http.get<ServiceRequest[]>('/requests');
  return data;
}

export async function createRequest(payload: CreateRequestPayload): Promise<ServiceRequest> {
  const { data } = await http.post<ServiceRequest>('/requests', payload);
  return data;
}

export async function updateRequest(id: string, payload: UpdateRequestPayload): Promise<ServiceRequest> {
  const { data } = await http.patch<ServiceRequest>(`/requests/${id}`, payload);
  return data;
}
