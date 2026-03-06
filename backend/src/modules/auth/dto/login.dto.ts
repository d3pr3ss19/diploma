import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { Role } from '../../../common/auth/role.enum';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
