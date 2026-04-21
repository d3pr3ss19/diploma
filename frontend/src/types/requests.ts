export type ServiceRequest = {
  id: string;
  accountId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  contactPhone?: string | null;
  preferredVisitAt?: string | null;
  createdByUserId: number;
  createdByUser?: {
    id: number;
    email: string;
    subscriber?: {
      id: string;
      fullName: string;
    } | null;
  };
  assignedToUserId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type RequestHistoryItem = {
  id: string;
  requestId: string;
  oldStatus: string;
  newStatus: string;
  changedByUserId: number;
  changedAt: string;
  comment?: string | null;
  changedByUser?: {
    id: number;
    email: string;
    fullName?: string | null;
  };
};
