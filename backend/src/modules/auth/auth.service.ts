import { createHash } from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';

import { Role } from '../../common/auth/role.enum';
import { createToken, verifyToken } from '../../common/auth/token.util';
import { PrismaService } from '../../prisma/prisma.service';
import { verifyPassword } from './auth-password.util';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly refreshTokenHashesByUserId = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  async login(body: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
      include: { role: true }
    });

    if (!user || !user.isActive || !verifyPassword(body.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const role = this.mapRole(user.role.code);
    const accessToken = createToken({ sub: user.id, role, type: 'access', ttlSeconds: 15 * 60 });
    const refreshToken = createToken({ sub: user.id, role, type: 'refresh', ttlSeconds: 7 * 24 * 60 * 60 });

    this.refreshTokenHashesByUserId.set(user.id, this.hashToken(refreshToken));

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role
      }
    };
  }

  async refresh(refreshToken: string) {
    const payload = verifyToken(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const storedHash = this.refreshTokenHashesByUserId.get(user.id);
    const providedHash = this.hashToken(refreshToken);
    if (!storedHash || storedHash !== providedHash) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const role = this.mapRole(user.role.code);
    const newAccessToken = createToken({ sub: user.id, role, type: 'access', ttlSeconds: 15 * 60 });
    const newRefreshToken = createToken({ sub: user.id, role, type: 'refresh', ttlSeconds: 7 * 24 * 60 * 60 });

    this.refreshTokenHashesByUserId.set(user.id, this.hashToken(newRefreshToken));

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  logout(refreshToken: string) {
    const payload = verifyToken(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      return { success: true };
    }

    const storedHash = this.refreshTokenHashesByUserId.get(payload.sub);
    if (storedHash && storedHash === this.hashToken(refreshToken)) {
      this.refreshTokenHashesByUserId.delete(payload.sub);
    }

    return { success: true };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private mapRole(code: RoleCode): Role {
    if (code === RoleCode.ADMIN) return Role.ADMIN;
    if (code === RoleCode.SUBSCRIBER) return Role.SUBSCRIBER;
    return Role.OPERATOR;
  }
}
