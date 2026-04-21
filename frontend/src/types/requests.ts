export type ServiceRequest = {
  id: string;
  accountId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdByUserId: string;
  createdByUser?: {
    id: string;
    email: string;
    subscriber?: {
      id: string;
      fullName: string;
    } | null;
  };
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RequestHistoryItem = {
  id: string;
  requestId: string;
  oldStatus: string;
  newStatus: string;
  changedByUserId: string;
  changedAt: string;
  comment?: string | null;
  changedByUser?: {
    id: string;
    email: string;
    fullName?: string | null;
  };
};
