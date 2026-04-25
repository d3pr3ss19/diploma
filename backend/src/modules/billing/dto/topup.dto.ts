import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsNumber, Min } from 'class-validator';

export class TopUpDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
