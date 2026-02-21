import { http } from './http';
import type { Subscriber, SubscriberDetails } from '../types/subscribers';

export async function getSubscribers(): Promise<Subscriber[]> {
  const { data } = await http.get<Subscriber[]>('/subscribers');
  return data;
}

export async function getSubscriberById(id: string): Promise<SubscriberDetails> {
  const { data } = await http.get<SubscriberDetails>(`/subscribers/${id}`);
  return data;
}
