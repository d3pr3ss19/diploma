import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';

@Injectable()
export class SubscribersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.subscriber.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id },
      include: { accounts: true }
    });

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with id '${id}' not found`);
    }

    return subscriber;
  }

  create(payload: CreateSubscriberDto) {
    return this.prisma.subscriber.create({
      data: {
        fullName: payload.fullName,
        phone: payload.phone,
        address: payload.address,
        apartment: payload.apartment,
        userId: payload.userId
      }
    });
  }

  async update(id: string, payload: UpdateSubscriberDto) {
    await this.findOne(id);

    return this.prisma.subscriber.update({
      where: { id },
      data: {
        fullName: payload.fullName,
        phone: payload.phone,
        address: payload.address,
        apartment: payload.apartment,
        userId: payload.userId
      }
    });
  }
}
