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
  };
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
};
