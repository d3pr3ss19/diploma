import { http } from './http';
import type { Subscriber, SubscriberDetails } from '../types/subscribers';

export type CreateSubscriberPayload = {
  fullName: string;
  phone: string;
  address: string;
  apartment?: string;
};

export type UpdateSubscriberPayload = Partial<CreateSubscriberPayload>;

export type CreatedSubscriberResponse = Subscriber & {
  generatedCredentials?: {
    login: string;
    password: string;
  };
};

export async function getSubscribers(): Promise<Subscriber[]> {
  const { data } = await http.get<Subscriber[]>('/subscribers');
  return data;
}

export async function getSubscriberById(id: string): Promise<SubscriberDetails> {
  const { data } = await http.get<SubscriberDetails>(`/subscribers/${id}`);
  return data;
}

export async function createSubscriber(payload: CreateSubscriberPayload): Promise<CreatedSubscriberResponse> {
  const { data } = await http.post<CreatedSubscriberResponse>('/subscribers', payload);
  return data;
}

export async function updateSubscriber(id: string, payload: UpdateSubscriberPayload): Promise<Subscriber> {
  const { data } = await http.patch<Subscriber>(`/subscribers/${id}`, payload);
  return data;
}
