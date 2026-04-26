export type Subscriber = {
  id: string;
  fullName: string;
  phone: string | null;
  address: string;
  apartment: string | null;
  userId: number | null;
  user?: {
    id?: number;
    isActual: boolean;
    deletedAt?: string | null;
    role?: {
      code: "ADMIN" | "OPERATOR" | "SUBSCRIBER";
    };
  } | null;
  accounts?: Array<{
    id: string;
    accountNumber?: string;
    balance: string;
    _count?: {
      requests: number;
    };
  }>;
  createdAt: string;
  updatedAt: string;
};

export type Account = {
  id: string;
  subscriberId: string;
  accountNumber: string;
  serviceType: string;
  balance: string;
  isActive: boolean;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriberDetails = Subscriber & {
  accounts: Account[];
};
