export type BillingTariffRegion = string;

export type TariffMap = {
  COLD_WATER: number;
  HOT_WATER: number;
  ELECTRICITY: number;
};

export type BillingSummary = {
  account: {
    id: string;
    accountNumber: string;
    balance: string;
    accruals: Array<{
      id: string;
      serviceType: string;
      period: string;
      consumption: string;
      amount: string;
      createdAt: string;
    }>;
    payments: Array<{
      id: string;
      amount: string;
      method: 'CASH' | 'CARD' | 'BANK_TRANSFER';
      paymentDate: string;
      externalRef?: string | null;
      createdAt: string;
    }>;
    meters: Array<{
      id: string;
      meterType: 'COLD_WATER' | 'HOT_WATER' | 'ELECTRICITY';
      serialNumber: string;
    }>;
  };
  totals: {
    accrued: number;
    paid: number;
  };
};
