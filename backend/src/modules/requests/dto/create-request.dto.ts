import { RequestCategory, RequestPriority } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, Matches } from 'class-validator';

export class CreateRequestDto {
  @IsUUID()
  accountId!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @IsEnum(RequestCategory)
  category!: RequestCategory;

  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @IsOptional()
  @IsString()
  @Matches(/^\+7\d{10}$/, { message: 'Формат телефона: +7XXXXXXXXXX' })
  contactPhone?: string;

  @IsOptional()
  @IsDateString()
  preferredVisitAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  assignedToUserId?: number;
}
