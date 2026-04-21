import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestPriority, RequestStatus } from '@prisma/client';

import { Role } from '../../common/auth/role.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, role: Role) {
    if (role === Role.SUBSCRIBER) {
      const accountIds = await this.resolveAccessibleAccountIdsForSubscriber(userId);
      return this.prisma.request.findMany({
        where: { accountId: { in: accountIds } },
        orderBy: { createdAt: 'desc' },
        include: {
          createdByUser: {
            select: {
              id: true,
              email: true,
              subscriber: { select: { id: true, fullName: true } }
            }
          }
        }
      });
    }

    return this.prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            subscriber: { select: { id: true, fullName: true } }
          }
        }
      }
    });
  }

  async findOne(id: string, userId: string, role: Role) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        history: true,
        createdByUser: {
          select: {
            id: true,
            email: true,
            subscriber: { select: { id: true, fullName: true } }
          }
        }
      }
    });

    if (!request) {
      throw new NotFoundException(`Request with id '${id}' not found`);
    }

    if (role === Role.SUBSCRIBER) {
      const allowed = await this.resolveAccessibleAccountIdsForSubscriber(userId);
      if (!allowed.includes(request.accountId)) {
        throw new ForbiddenException('Нет доступа к заявке другого абонента');
      }
    }

    return request;
  }

  async history(id: string, userId: string, role: Role) {
    await this.findOne(id, userId, role);

    return this.prisma.requestStatusHistory.findMany({
      where: { requestId: id },
      orderBy: { changedAt: 'desc' },
      include: {
        changedByUser: {
          select: {
            id: true,
            email: true,
            fullName: true,
          }
        }
      }
    });
  }

  async update(id: string, payload: UpdateRequestDto, changedByUserId: string) {
    const existing = await this.prisma.request.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Request with id '${id}' not found`);
    }

    const updated = await this.prisma.request.update({
      where: { id },
      data: {
        title: payload.title,
        description: payload.description,
        category: payload.category,
        status: payload.status,
        priority: payload.priority,
        contactPhone: payload.contactPhone,
        preferredVisitAt: payload.preferredVisitAt ? new Date(payload.preferredVisitAt) : undefined,
        assignedToUserId: payload.assignedToUserId
      }
    });

    if ((payload.status && payload.status !== existing.status) || payload.comment) {
      await this.prisma.requestStatusHistory.create({
        data: {
          requestId: id,
          oldStatus: existing.status,
          newStatus: payload.status ?? existing.status,
          changedByUserId,
          comment: payload.comment || 'Изменение заявки оператором/админом'
        }
      });
    }

    await this.prisma.adminAuditLog.create({
      data: {
        actorUserId: changedByUserId,
        targetUserId: existing.createdByUserId,
        action: 'REQUEST_UPDATED',
        details: {
          section: 'REQUESTS',
          requestId: id,
          before: {
            title: existing.title,
            description: existing.description,
            category: existing.category,
            status: existing.status,
            priority: existing.priority,
            contactPhone: existing.contactPhone,
            preferredVisitAt: existing.preferredVisitAt,
            assignedToUserId: existing.assignedToUserId,
            comment: null
          },
          after: {
            title: updated.title,
            description: updated.description,
            category: updated.category,
            status: updated.status,
            priority: updated.priority,
            contactPhone: updated.contactPhone,
            preferredVisitAt: updated.preferredVisitAt,
            assignedToUserId: updated.assignedToUserId,
            comment: payload.comment ?? null
          }
        }
      }
    });

    return updated;
  }

  async create(payload: CreateRequestDto, createdByUserId: string, role: Role) {
    if (role === Role.SUBSCRIBER) {
      const accountIds = await this.resolveAccessibleAccountIdsForSubscriber(createdByUserId);
      if (!accountIds.includes(payload.accountId)) {
        throw new ForbiddenException('Абонент может создавать заявки только по своим лицевым счетам');
      }
    }

    const created = await this.prisma.request.create({
      data: {
        accountId: payload.accountId,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        priority: payload.priority ?? RequestPriority.NORMAL,
        contactPhone: payload.contactPhone,
        preferredVisitAt: payload.preferredVisitAt ? new Date(payload.preferredVisitAt) : undefined,
        createdByUserId,
        assignedToUserId: role === Role.SUBSCRIBER ? null : payload.assignedToUserId,
        status: RequestStatus.NEW
      }
    });

    await this.prisma.requestStatusHistory.create({
      data: {
        requestId: created.id,
        oldStatus: RequestStatus.NEW,
        newStatus: RequestStatus.NEW,
        changedByUserId: createdByUserId,
        comment: 'Заявка создана'
      }
    });

    await this.prisma.adminAuditLog.create({
      data: {
        actorUserId: createdByUserId,
        targetUserId: createdByUserId,
        action: 'REQUEST_CREATED',
        details: {
          section: 'REQUESTS',
          requestId: created.id,
          category: created.category,
          priority: created.priority,
          title: created.title
        }
      }
    });

    return created;
  }

  private async resolveAccessibleAccountIdsForSubscriber(userId: string): Promise<string[]> {
    const subscriber = await this.prisma.subscriber.findFirst({
      where: { userId },
      include: { accounts: { select: { id: true } } }
    });

    if (!subscriber) {
      return [];
    }

    return subscriber.accounts.map((account) => account.id);
  }
}
