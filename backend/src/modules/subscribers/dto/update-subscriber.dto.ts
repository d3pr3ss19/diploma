import { IsOptional, IsPhoneNumber, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateSubscriberDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsPhoneNumber('UA')
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  apartment?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
