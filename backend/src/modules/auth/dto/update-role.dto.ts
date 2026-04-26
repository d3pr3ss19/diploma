import { RoleCode } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRoleDto {
  @IsEnum(RoleCode)
  role!: RoleCode;
}
