import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { verifyToken } from './token.util';
import { Role } from './role.enum';

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
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
    const payload = verifyToken(token);

    if (!payload || payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    request.user = {
      id: payload.sub,
      role: payload.role
    };

    return true;
  }
}
