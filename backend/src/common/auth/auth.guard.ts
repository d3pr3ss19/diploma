import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { Role } from './role.enum';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: Role;
  };
};

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    // MVP token format: demo-<ROLE>-<USER_ID>
    const [prefix, roleValue, userId] = token.split('-');

    if (prefix !== 'demo' || !roleValue || !userId) {
      throw new UnauthorizedException('Invalid token format');
    }

    if (!Object.values(Role).includes(roleValue as Role)) {
      throw new UnauthorizedException('Unknown role in token');
    }

    request.user = {
      id: userId,
      role: roleValue as Role
    };

    return true;
  }
}
