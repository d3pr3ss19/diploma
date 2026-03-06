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
    const parsedToken = this.parseDemoToken(token);

    if (!parsedToken) {
      throw new UnauthorizedException('Invalid token format');
    }

    request.user = parsedToken;

    return true;
  }

  private parseDemoToken(token: string): { id: string; role: Role } | null {
    // MVP token format: demo-<ROLE>-<USER_ID>
    const match = token.match(/^demo-(ADMIN|OPERATOR|SUBSCRIBER)-(.+)$/);
    if (!match) {
      return null;
    }

    const [, roleValue, userId] = match;
    const role = roleValue as Role;

    if (!userId.trim()) {
      return null;
    }

    return { id: userId, role };
  }
}
