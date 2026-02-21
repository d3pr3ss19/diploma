import { RequestCategory } from '@prisma/client';

export class CreateRequestDto {
  accountId!: string;
  title!: string;
  description!: string;
  category!: RequestCategory;
  createdByUserId!: string;
  assignedToUserId?: string;
}
