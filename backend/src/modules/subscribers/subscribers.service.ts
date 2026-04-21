import { randomBytes } from 'crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../auth/auth-password.util';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';

@Injectable()
export class SubscribersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.subscriber.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            isActual: true,
            deletedAt: true,
            email: true,
            role: {
              select: {
                code: true
              }
            }
          }
        },
        accounts: {
          select: {
            id: true,
            balance: true,
            _count: {
              select: {
                requests: true
              }
            }
          }
        }
      }
    });
  }


  async findByUserId(userId?: number) {
    if (!userId) {
      throw new NotFoundException('Subscriber profile not found');
    }

    const subscriber = await this.prisma.subscriber.findFirst({
      where: { userId },
      include: {
        accounts: true,
        user: {
          select: {
            id: true,
            isActual: true,
            deletedAt: true,
            email: true,
            role: { select: { code: true } }
          }
        }
      }
    });

    if (!subscriber) {
      throw new NotFoundException('Subscriber profile not found');
    }

    return subscriber;
  }

  async findOne(id: string) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id },
      include: {
        accounts: true,
        user: {
          select: {
            id: true,
            isActual: true,
            deletedAt: true,
            email: true,
            role: {
              select: {
                code: true
              }
            }
          }
        }
      }
    });

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with id '${id}' not found`);
    }

    return subscriber;
  }

  async create(payload: CreateSubscriberDto, actorUserId?: number) {
    const subscriberRole = await this.prisma.role.findUniqueOrThrow({ where: { code: RoleCode.SUBSCRIBER } });

    const password = this.generatePassword();
    const email = await this.generateSubscriberEmail(payload.phone);
    const passwordHash = hashPassword(password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          roleId: subscriberRole.id,
          isActual: true
        }
      });

      const subscriber = await tx.subscriber.create({
        data: {
          fullName: payload.fullName,
          phone: payload.phone,
          address: payload.address,
          apartment: payload.apartment,
          userId: user.id
        }
      });

      await tx.account.create({
        data: {
          subscriberId: subscriber.id,
          accountNumber: this.generateAccountNumber(),
          balance: 0,
          openedAt: new Date()
        }
      });

      await tx.adminAuditLog.create({
        data: {
          actorUserId,
          targetUserId: user.id,
          action: 'SUBSCRIBER_CREATED',
          details: {
            section: 'SUBSCRIBERS',
            subscriberId: subscriber.id,
            fullName: payload.fullName
          }
        }
      });

      return subscriber;
    });

    return {
      ...result,
      generatedCredentials: {
        login: email,
        password
      }
    };
  }

  async update(id: string, payload: UpdateSubscriberDto, actorUserId?: number) {
    const before = await this.findOne(id);

    const updated = await this.prisma.subscriber.update({
      where: { id },
      data: {
        fullName: payload.fullName,
        phone: payload.phone,
        address: payload.address,
        apartment: payload.apartment
      }
    });

    const targetUserId = before.userId ?? actorUserId;
    if (targetUserId) {
      await this.prisma.adminAuditLog.create({
        data: {
          actorUserId,
          targetUserId,
        action: 'SUBSCRIBER_UPDATED',
        details: {
          section: 'SUBSCRIBERS',
          subscriberId: id,
          before: {
            fullName: before.fullName,
            phone: before.phone,
            address: before.address,
            apartment: before.apartment
          },
          after: {
            fullName: updated.fullName,
            phone: updated.phone,
            address: updated.address,
            apartment: updated.apartment
          }
        }
        }
      });
    }

    return updated;
  }

  private generatePassword(): string {
    return randomBytes(6).toString('base64url');
  }

  private generateAccountNumber(): string {
    const timestampPart = Date.now().toString().slice(-6);
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `LS${timestampPart}${randomPart}`;
  }

  private async generateSubscriberEmail(phone: string): Promise<string> {
    const digits = phone.replace(/\D/g, '').slice(-10);
    const base = `subscriber.${digits || Date.now()}@kp.local`;

    const exists = await this.prisma.user.findUnique({ where: { email: base } });
    if (!exists) {
      return base;
    }

    return `subscriber.${digits || Date.now()}.${randomBytes(2).toString('hex')}@kp.local`;
  }
}
