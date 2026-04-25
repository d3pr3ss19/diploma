import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MeterType, PaymentMethod, Prisma } from '@prisma/client';

import { Role } from '../../common/auth/role.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { PayFromBalanceDto } from './dto/pay-from-balance.dto';
import { SubmitReadingDto } from './dto/submit-reading.dto';
import { TopUpDto } from './dto/topup.dto';

const REGION_TARIFFS: Record<string, Record<MeterType, number>> = {
  MOSCOW: {
    COLD_WATER: 42.3,
    HOT_WATER: 205.15,
    ELECTRICITY: 6.73,
  },
  KRASNOYARSK: {
    COLD_WATER: 31.9,
    HOT_WATER: 163.4,
    ELECTRICITY: 4.12,
  },
  DEFAULT: {
    COLD_WATER: 35.0,
    HOT_WATER: 180.0,
    ELECTRICITY: 5.5,
  },
};

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  listRegions() {
    return Object.keys(REGION_TARIFFS).filter((key) => key !== 'DEFAULT');
  }

  getTariffs(region: string) {
    const normalized = region.trim().toUpperCase();
    const tariffs = REGION_TARIFFS[normalized] ?? REGION_TARIFFS.DEFAULT;
    return {
      region: REGION_TARIFFS[normalized] ? normalized : 'DEFAULT',
      tariffs,
    };
  }

  async getAccountSummary(accountId: string, userId: number, role: Role) {
    await this.ensureAccountAccess(accountId, userId, role);

    const [account, accrualTotalRaw, paymentTotalRaw] = await Promise.all([
      this.prisma.account.findUnique({
        where: { id: accountId },
        include: {
          accruals: { orderBy: { createdAt: 'desc' }, take: 20 },
          payments: { orderBy: { createdAt: 'desc' }, take: 20 },
          meters: { where: { isActive: true }, select: { id: true, meterType: true, serialNumber: true } },
        },
      }),
      this.prisma.accrual.aggregate({ where: { accountId }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { accountId }, _sum: { amount: true } }),
    ]);

    if (!account) {
      throw new NotFoundException('Лицевой счет не найден');
    }

    return {
      account,
      totals: {
        accrued: Number(accrualTotalRaw._sum.amount ?? 0),
        paid: Number(paymentTotalRaw._sum.amount ?? 0),
      },
    };
  }

  async submitReading(accountId: string, payload: SubmitReadingDto, userId: number, role: Role) {
    await this.ensureAccountAccess(accountId, userId, role);

    const tariff = this.resolveTariff(payload.region, payload.meterType);
    const readingPeriod = new Date(payload.period);

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account) {
        throw new NotFoundException('Лицевой счет не найден');
      }

      let meter = await tx.meter.findFirst({
        where: { accountId, meterType: payload.meterType, isActive: true },
        orderBy: { installedAt: 'asc' },
      });

      if (!meter) {
        meter = await tx.meter.create({
          data: {
            accountId,
            meterType: payload.meterType,
            serialNumber: `SIM-${payload.meterType}-${Date.now()}`,
            installedAt: new Date(),
            isActive: true,
          },
        });
      }

      const latestReading = await tx.meterReading.findFirst({
        where: { meterId: meter.id, readingPeriod: { lt: readingPeriod } },
        orderBy: { readingPeriod: 'desc' },
      });

      const previous = Number(latestReading?.value ?? 0);
      const current = payload.value;
      if (current < previous) {
        throw new BadRequestException('Показание не может быть меньше предыдущего');
      }

      const consumption = Number((current - previous).toFixed(3));
      const amount = Number((consumption * tariff).toFixed(2));

      await tx.meterReading.upsert({
        where: {
          meterId_readingPeriod: {
            meterId: meter.id,
            readingPeriod,
          },
        },
        update: {
          value: new Prisma.Decimal(current),
          submittedByUserId: userId,
        },
        create: {
          meterId: meter.id,
          readingPeriod,
          value: new Prisma.Decimal(current),
          submittedByUserId: userId,
        },
      });

      const accrual = await tx.accrual.create({
        data: {
          accountId,
          period: readingPeriod,
          serviceType: payload.meterType,
          consumption: new Prisma.Decimal(consumption),
          amount: new Prisma.Decimal(amount),
        },
      });

      const updatedAccount = await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { decrement: amount },
        },
      });

      await tx.adminAuditLog.create({
        data: {
          actorUserId: userId,
          targetUserId: userId,
          action: 'METER_READING_SUBMITTED',
          details: {
            section: 'BILLING',
            accountId,
            meterType: payload.meterType,
            region: payload.region,
            previous,
            current,
            consumption,
            tariff,
            amount,
          },
        },
      });

      return {
        accrual,
        chargedAmount: amount,
        updatedBalance: Number(updatedAccount.balance),
      };
    });
  }

  async topUp(accountId: string, payload: TopUpDto, userId: number, role: Role) {
    await this.ensureAccountAccess(accountId, userId, role);
    const amount = Number(payload.amount.toFixed(2));

    const result = await this.prisma.$transaction(async (tx) => {
      const account = await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { increment: amount },
        },
      });

      const payment = await tx.payment.create({
        data: {
          accountId,
          paymentDate: new Date(),
          amount: new Prisma.Decimal(amount),
          method: payload.method,
          externalRef: `MOCK_TOPUP_${Date.now()}`,
        },
      });

      return { account, payment };
    });

    return {
      success: true,
      method: payload.method,
      amount,
      updatedBalance: Number(result.account.balance),
      paymentId: result.payment.id,
    };
  }

  async payFromBalance(accountId: string, payload: PayFromBalanceDto, userId: number, role: Role) {
    await this.ensureAccountAccess(accountId, userId, role);

    const amount = Number(payload.amount.toFixed(2));

    const result = await this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account) {
        throw new NotFoundException('Лицевой счет не найден');
      }

      const currentBalance = Number(account.balance);
      if (currentBalance < amount) {
        throw new BadRequestException('Недостаточно средств на лицевом счете');
      }

      const updated = await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { decrement: amount },
        },
      });

      const payment = await tx.payment.create({
        data: {
          accountId,
          paymentDate: new Date(),
          amount: new Prisma.Decimal(amount),
          method: payload.method,
          externalRef: `MOCK_SERVICE_PAY_${Date.now()}`,
        },
      });

      return { updated, payment };
    });

    return {
      success: true,
      amount,
      method: payload.method,
      paymentId: result.payment.id,
      updatedBalance: Number(result.updated.balance),
    };
  }

  private resolveTariff(region: string, meterType: MeterType): number {
    const normalized = region.trim().toUpperCase();
    const regionTariffs = REGION_TARIFFS[normalized] ?? REGION_TARIFFS.DEFAULT;
    return regionTariffs[meterType];
  }

  private async ensureAccountAccess(accountId: string, userId: number, role: Role) {
    if (role !== Role.SUBSCRIBER) {
      return;
    }

    const subscriber = await this.prisma.subscriber.findFirst({
      where: { userId },
      include: { accounts: { select: { id: true } } },
    });

    if (!subscriber || !subscriber.accounts.some((account) => account.id === accountId)) {
      throw new ForbiddenException('Нет доступа к этому лицевому счёту');
    }
  }
}
