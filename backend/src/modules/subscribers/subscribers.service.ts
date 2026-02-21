import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';

@Injectable()
export class SubscribersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    // TODO(step 2.3): replace with prisma.subscriber.findMany when DB is configured.
    return [];
  }

  findOne(id: string) {
    // TODO(step 2.3): replace with prisma.subscriber.findUnique.
    return { id };
  }

  create(payload: CreateSubscriberDto) {
    // TODO(step 2.3): replace with prisma.subscriber.create.
    return {
      id: 'stub-subscriber-id',
      ...payload
    };
  }
}
