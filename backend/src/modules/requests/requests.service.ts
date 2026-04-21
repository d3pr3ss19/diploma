import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            subscriber: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      }
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        history: true,
        createdByUser: {
          select: {
            id: true,
            email: true,
            subscriber: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      }
    });

    if (!request) {
      throw new NotFoundException(`Request with id '${id}' not found`);
    }

    return request;
  }

  async update(id: string, payload: UpdateRequestDto, changedByUserId: string) {
    const existing = await this.findOne(id);

    const updated = await this.prisma.request.update({
      where: { id },
      data: {
        title: payload.title,
        description: payload.description,
        category: payload.category,
        status: payload.status,
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
            assignedToUserId: existing.assignedToUserId,
            comment: null
          },
          after: {
            title: updated.title,
            description: updated.description,
            category: updated.category,
            status: updated.status,
            assignedToUserId: updated.assignedToUserId,
            comment: payload.comment ?? null
          }
        }
      }
    });

    return updated;
  }

  async create(payload: CreateRequestDto, createdByUserId: string) {
    const created = await this.prisma.request.create({
      data: {
        accountId: payload.accountId,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        createdByUserId,
        assignedToUserId: payload.assignedToUserId,
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
          title: created.title
        }
      }
    });

    return created;
  }
}
