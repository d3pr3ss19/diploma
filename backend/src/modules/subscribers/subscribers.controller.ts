import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { SubscribersService } from './subscribers.service';

@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Get()
  list() {
    return this.subscribersService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscribersService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateSubscriberDto) {
    return this.subscribersService.create(body);
  }
}
