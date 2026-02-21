import { http } from './http';
import type { Subscriber, SubscriberDetails } from '../types/subscribers';

export type CreateSubscriberPayload = {
  fullName: string;
  phone: string;
  address: string;
  apartment?: string;
  userId?: string;
};

export async function getSubscribers(): Promise<Subscriber[]> {
  const { data } = await http.get<Subscriber[]>('/subscribers');
  return data;
}

export async function getSubscriberById(id: string): Promise<SubscriberDetails> {
  const { data } = await http.get<SubscriberDetails>(`/subscribers/${id}`);
  return data;
}

export async function createSubscriber(payload: CreateSubscriberPayload): Promise<Subscriber> {
  const { data } = await http.post<Subscriber>('/subscribers', payload);
  return data;
}
