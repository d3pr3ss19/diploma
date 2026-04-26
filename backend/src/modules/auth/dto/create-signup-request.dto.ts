import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSignupRequestDto {
  @IsString()
  @MinLength(5)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  phone!: string;

  @IsString()
  @MinLength(5)
  address!: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsString()
  @MinLength(2)
  region!: string;
}
