export type DashboardMockData = {
  activeSubscribers: number;
  openTickets: number;
  totalDebt: number;
  monthlyPayments: number;
  overdueTickets: number;
  debtorsCount: number;
  lastUpdated: string;
};

export type ChartPoint = {
  label: string;
  accruals: number;
  payments: number;
};
