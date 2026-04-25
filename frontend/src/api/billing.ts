import { http } from './http';
import type { BillingSummary, TariffMap } from '../types/billing';

export type SubmitReadingPayload = {
  meterType: 'COLD_WATER' | 'HOT_WATER' | 'ELECTRICITY';
  value: number;
  period: string;
  region: string;
};

export type BalanceActionPayload = {
  amount: number;
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER';
};

export async function getBillingRegions(): Promise<string[]> {
  const { data } = await http.get<string[]>('/billing/regions');
  return data;
}

export async function getTariffs(region: string): Promise<{ region: string; tariffs: TariffMap }> {
  const { data } = await http.get<{ region: string; tariffs: TariffMap }>('/billing/tariffs', { params: { region } });
  return data;
}

export async function getBillingAdminLogs(limit = 200) {
  const { data } = await http.get('/billing/admin/logs', { params: { limit } });
  return data as Array<{
    id: string;
    action: string;
    createdAt: string;
    details?: Record<string, unknown>;
    actorUser?: { id: number; email: string; fullName?: string | null } | null;
  }>;
}

export async function getMyBillingNotification() {
  const { data } = await http.get('/billing/notifications/me');
  return data as {
    shouldNotify: boolean;
    dayOfMonth: number;
    notifications: Array<{
      accountId: string;
      accountNumber: string;
      balance: number;
      monthAccrued: number;
      needPayment: boolean;
      text: string;
    }>;
  };
}

export async function getBillingSummary(accountId: string): Promise<BillingSummary> {
  const { data } = await http.get<BillingSummary>(`/billing/accounts/${accountId}/summary`);
  return data;
}

export async function submitReading(accountId: string, payload: SubmitReadingPayload) {
  const { data } = await http.post(`/billing/accounts/${accountId}/readings`, payload);
  return data;
}

export async function topUpBalance(accountId: string, payload: BalanceActionPayload) {
  const { data } = await http.post(`/billing/accounts/${accountId}/top-up`, payload);
  return data;
}

export async function payFromBalance(accountId: string, payload: BalanceActionPayload) {
  const { data } = await http.post(`/billing/accounts/${accountId}/pay`, payload);
  return data;
}
