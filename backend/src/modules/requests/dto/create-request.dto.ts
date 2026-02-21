export class CreateRequestDto {
  accountId!: string;
  title!: string;
  description!: string;
  category!: 'ACCIDENT' | 'COMPLAINT' | 'QUESTION';
  createdByUserId!: string;
  assignedToUserId?: string;
}
