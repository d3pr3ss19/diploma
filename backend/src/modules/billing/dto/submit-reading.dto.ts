import { MeterType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubmitReadingDto {
  @IsEnum(MeterType)
  meterType!: MeterType;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsDateString()
  period!: string;

  @IsOptional()
  @IsString()
  region?: string;
}
