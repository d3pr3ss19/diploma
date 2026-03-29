import { RequestCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

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
  @IsUUID()
  assignedToUserId?: string;
}
