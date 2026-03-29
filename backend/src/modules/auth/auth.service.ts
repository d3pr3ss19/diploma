import { createHash, randomBytes } from 'crypto';

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';

import { Role } from '../../common/auth/role.enum';
import { createToken, verifyToken } from '../../common/auth/token.util';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, verifyPassword } from './auth-password.util';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(body: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
      include: { role: true }
    });

    if (!user || !user.isActual || !verifyPassword(body.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const role = this.mapRole(user.role.code);
    const accessToken = createToken({ sub: user.id, role, type: 'access', ttlSeconds: 15 * 60 });
    const refreshToken = createToken({ sub: user.id, role, type: 'refresh', ttlSeconds: 7 * 24 * 60 * 60 });

    await this.storeActiveRefreshToken(user.id, refreshToken);

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

    if (!user || !user.isActual) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const activeSession = await this.prisma.refreshSession.findFirst({
      where: {
        userId: user.id,
        revokedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    const providedHash = this.hashToken(refreshToken);
    if (!activeSession || activeSession.tokenHash !== providedHash || activeSession.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const role = this.mapRole(user.role.code);
    const newAccessToken = createToken({ sub: user.id, role, type: 'access', ttlSeconds: 15 * 60 });
    const newRefreshToken = createToken({ sub: user.id, role, type: 'refresh', ttlSeconds: 7 * 24 * 60 * 60 });

    await this.prisma.refreshSession.update({
      where: { id: activeSession.id },
      data: {
        tokenHash: this.hashToken(newRefreshToken),
        expiresAt: this.refreshExpiryDate()
      }
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  async logout(refreshToken: string) {
    const payload = verifyToken(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      return { success: true };
    }

    await this.prisma.refreshSession.updateMany({
      where: {
        userId: payload.sub,
        tokenHash: this.hashToken(refreshToken),
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    return { success: true };
  }

  async deactivateUser(userId: string, actorUserId?: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActual: false,
        deletedAt: null
      }
    });

    await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    await this.createAuditLog(actorUserId, userId, 'USER_DEACTIVATED');

    return { success: true };
  }


  async activateUser(userId: string, actorUserId?: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActual: true,
        deletedAt: null
      }
    });

    await this.createAuditLog(actorUserId, userId, 'USER_ACTIVATED');

    return { success: true };
  }

  async deleteUser(userId: string, actorUserId?: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isActual: false,
          deletedAt: new Date()
        }
      });

      await this.prisma.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });

      await this.createAuditLog(actorUserId, userId, 'USER_ARCHIVED');
    } catch (error) {
      throw new ConflictException('Не удалось архивировать пользователя.');
    }

    return { success: true };
  }
  async resetUserPassword(userId: string, actorUserId?: string) {
    const newPassword = randomBytes(6).toString('base64url');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashPassword(newPassword),
        isActual: true,
        deletedAt: null
      }
    });

    await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    await this.createAuditLog(actorUserId, userId, 'USER_PASSWORD_RESET');

    return {
      success: true,
      password: newPassword
    };
  }

  private async createAuditLog(actorUserId: string | undefined, targetUserId: string, action: string) {
    await this.prisma.adminAuditLog.create({
      data: {
        actorUserId,
        targetUserId,
        action
      }
    });
  }

  private async storeActiveRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash,
        expiresAt: this.refreshExpiryDate()
      }
    });
  }

  private refreshExpiryDate(): Date {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
