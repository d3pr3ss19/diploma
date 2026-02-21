import { Injectable } from '@nestjs/common';

import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
  list() {
    // TODO(step 2.3): replace with prisma.request.findMany.
    return [];
  }

  findOne(id: string) {
    // TODO(step 2.3): replace with prisma.request.findUnique.
    return { id };
  }

  create(payload: CreateRequestDto) {
    // TODO(step 2.3): replace with prisma.request.create.
    return {
      id: 'stub-request-id',
      status: 'NEW',
      ...payload
    };
  }
}
