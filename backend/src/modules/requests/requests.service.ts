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

    if (payload.status && payload.status !== existing.status) {
      await this.prisma.requestStatusHistory.create({
        data: {
          requestId: id,
          oldStatus: existing.status,
          newStatus: payload.status,
          changedByUserId,
          comment: 'Статус обновлён оператором/админом'
        }
      });
    }

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

    return created;
  }
}
