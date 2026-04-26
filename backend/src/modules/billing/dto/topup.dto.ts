import { IsIn, IsNumber, Min } from 'class-validator';

export class TopUpDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsIn(['CARD', 'BANK_TRANSFER'])
  method!: 'CARD' | 'BANK_TRANSFER';
}
