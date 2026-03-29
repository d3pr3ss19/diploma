import { randomBytes } from 'crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';

import { hashPassword } from '../auth/auth-password.util';
import { PrismaService } from '../../prisma/prisma.service';
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
            email: true
          }
        },
        accounts: {
          select: {
            id: true,
            balance: true
          }
        }
      }
    });
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
            email: true
          }
        }
      }
    });

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with id '${id}' not found`);
    }

    return subscriber;
  }

  async create(payload: CreateSubscriberDto) {
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

  async update(id: string, payload: UpdateSubscriberDto) {
    await this.findOne(id);

    return this.prisma.subscriber.update({
      where: { id },
      data: {
        fullName: payload.fullName,
        phone: payload.phone,
        address: payload.address,
        apartment: payload.apartment
      }
    });
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
