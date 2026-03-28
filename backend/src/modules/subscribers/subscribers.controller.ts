import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';
import { Role } from '../../common/auth/role.enum';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { SubscribersService } from './subscribers.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Get()
  list() {
    return this.subscribersService.list();
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.subscribersService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Post()
  create(@Body() body: CreateSubscriberDto) {
    return this.subscribersService.create(body);
  }
}
