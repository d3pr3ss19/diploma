import { IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSubscriberDto {
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  fullName!: string;

  @IsPhoneNumber('RU')
  phone!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(255)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  apartment?: string;
}
