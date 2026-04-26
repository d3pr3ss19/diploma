import { createHash, randomBytes } from 'crypto';

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';

import { Role } from '../../common/auth/role.enum';
import { createToken, verifyToken } from '../../common/auth/token.util';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, verifyPassword } from './auth-password.util';
import { CreateSignupRequestDto } from './dto/create-signup-request.dto';
import { LoginDto } from './dto/login.dto';
import { ReviewSignupRequestDto } from './dto/review-signup-request.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

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
        fullName: user.fullName ?? null,
        region: user.region ?? null,
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

  async deactivateUser(userId: number, actorUserId?: number) {
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

    await this.createAuditLog(actorUserId, userId, 'USER_DEACTIVATED', { section: 'USERS' });

    return { success: true };
  }

  async activateUser(userId: number, actorUserId?: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActual: true,
        deletedAt: null
      }
    });

    await this.createAuditLog(actorUserId, userId, 'USER_ACTIVATED', { section: 'USERS' });

    return { success: true };
  }

  async deleteUser(userId: number, actorUserId?: number) {
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

      await this.createAuditLog(actorUserId, userId, 'USER_ARCHIVED', { section: 'USERS' });
    } catch {
      throw new ConflictException('Не удалось архивировать пользователя.');
    }

    return { success: true };
  }

  async resetUserPassword(userId: number, actorUserId?: number) {
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

    await this.createAuditLog(actorUserId, userId, 'USER_PASSWORD_RESET', { section: 'USERS' });

    return {
      success: true,
      password: newPassword
    };
  }

  async updateUserRole(userId: number, payload: UpdateRoleDto, actorUserId?: number) {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { code: payload.role } });
    const previous = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: true }
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id },
      include: { role: true }
    });

    await this.createAuditLog(actorUserId, userId, 'USER_ROLE_UPDATED', {
      section: 'USERS',
      fromRole: previous.role.code,
      toRole: updated.role.code
    });

    return {
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName ?? null,
        region: updated.region ?? null,
        role: this.mapRole(updated.role.code)
      }
    };
  }

  async updateProfile(actorUserId: number | undefined, payload: UpdateProfileDto) {
    if (!actorUserId) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    const before = await this.prisma.user.findUniqueOrThrow({ where: { id: actorUserId } });
    const updated = await this.prisma.user.update({
      where: { id: actorUserId },
      data: { email: payload.email, fullName: payload.fullName, region: payload.region },
      include: { role: true }
    });

    await this.createAuditLog(actorUserId, actorUserId, 'USER_PROFILE_UPDATED', {
      section: 'USERS',
      before: { email: before.email, fullName: before.fullName, region: before.region },
      after: { email: updated.email, fullName: updated.fullName, region: updated.region }
    });

    return {
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName ?? null,
        region: updated.region ?? null,
        role: this.mapRole(updated.role.code)
      }
    };
  }

  async createSignupRequest(payload: CreateSignupRequestDto) {
    const created = await this.prisma.signupRequest.create({
      data: {
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        apartment: payload.apartment,
        region: payload.region
      }
    });

    return { success: true, request: created };
  }

  async listSignupRequests(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.prisma.signupRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { reviewedByUser: { select: { id: true, email: true, fullName: true } } }
    });
  }

  async approveSignupRequest(id: number, actorUserId: number, review?: ReviewSignupRequestDto) {
    const signup = await this.prisma.signupRequest.findUniqueOrThrow({ where: { id } });
    if (signup.status !== 'PENDING') {
      return { success: true, message: 'Заявка уже обработана', status: signup.status };
    }

    const subscriberRole = await this.prisma.role.findUniqueOrThrow({ where: { code: RoleCode.SUBSCRIBER } });
    const generatedPassword = randomBytes(6).toString('base64url');

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: signup.email,
          fullName: signup.fullName,
          region: signup.region,
          passwordHash: hashPassword(generatedPassword),
          roleId: subscriberRole.id,
          isActual: true
        }
      });

      const subscriber = await tx.subscriber.create({
        data: {
          fullName: signup.fullName,
          phone: signup.phone,
          address: signup.address,
          apartment: signup.apartment,
          userId: user.id
        }
      });

      const account = await tx.account.create({
        data: {
          subscriberId: subscriber.id,
          accountNumber: `ACC-${Date.now()}-${user.id}`,
          balance: 0,
          openedAt: new Date()
        }
      });

      await tx.signupRequest.update({
        where: { id: signup.id },
        data: {
          status: 'APPROVED',
          reviewedByUserId: actorUserId,
          reviewComment: review?.comment
        }
      });

      return { user, account };
    });

    await this.createAuditLog(actorUserId, result.user.id, 'SIGNUP_REQUEST_APPROVED', {
      section: 'USERS',
      signupRequestId: id
    });

    return {
      success: true,
      userId: result.user.id,
      accountId: result.account.id,
      generatedPassword
    };
  }

  async rejectSignupRequest(id: number, actorUserId: number, review?: ReviewSignupRequestDto) {
    const signup = await this.prisma.signupRequest.findUniqueOrThrow({ where: { id } });
    const updated = await this.prisma.signupRequest.update({
      where: { id: signup.id },
      data: {
        status: 'REJECTED',
        reviewedByUserId: actorUserId,
        reviewComment: review?.comment
      }
    });

    await this.createAuditLog(actorUserId, actorUserId, 'SIGNUP_REQUEST_REJECTED', {
      section: 'USERS',
      signupRequestId: id
    });

    return { success: true, request: updated };
  }

  async listAuditLogs(section?: 'USERS' | 'SUBSCRIBERS' | 'REQUESTS' | 'BILLING') {
    return this.prisma.adminAuditLog.findMany({
      where: section
        ? {
            details: {
              path: ['section'],
              equals: section
            }
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        actorUser: { select: { id: true, email: true } },
        targetUser: { select: { id: true, email: true } }
      }
    });
  }

  async createAuditLog(actorUserId: number | undefined, targetUserId: number, action: string, details?: object) {
    await this.prisma.adminAuditLog.create({
      data: {
        actorUserId,
        targetUserId,
        action,
        details: details ?? undefined
      }
    });
  }

  private async storeActiveRefreshToken(userId: number, refreshToken: string) {
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
