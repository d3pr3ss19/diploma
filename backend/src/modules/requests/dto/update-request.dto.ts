import { RequestCategory, RequestPriority, RequestStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength, Matches } from 'class-validator';

export class UpdateRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(RequestCategory)
  category?: RequestCategory;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

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
  @IsUUID()
  assignedToUserId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
