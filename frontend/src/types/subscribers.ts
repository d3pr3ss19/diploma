export type Subscriber = {
  id: string;
  fullName: string;
  phone: string | null;
  address: string;
  apartment: string | null;
  userId: string | null;
  user?: {
    isActual: boolean;
    deletedAt?: string | null;
    role?: {
      code: "ADMIN" | "OPERATOR" | "SUBSCRIBER";
    };
  } | null;
  accounts?: Array<{
    id: string;
    balance: string;
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
