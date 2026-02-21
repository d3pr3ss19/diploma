import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.request.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: { history: true }
    });

    if (!request) {
      throw new NotFoundException(`Request with id '${id}' not found`);
    }

    return request;
  }

  async create(payload: CreateRequestDto) {
    const created = await this.prisma.request.create({
      data: {
        accountId: payload.accountId,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        createdByUserId: payload.createdByUserId,
        assignedToUserId: payload.assignedToUserId,
        status: RequestStatus.NEW
      }
    });

    await this.prisma.requestStatusHistory.create({
      data: {
        requestId: created.id,
        oldStatus: RequestStatus.NEW,
        newStatus: RequestStatus.NEW,
        changedByUserId: payload.createdByUserId,
        comment: 'Заявка создана'
      }
    });

    return created;
  }
}
