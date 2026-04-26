import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  region?: string;
}
