import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { AuthGuard } from '../../common/auth/auth.guard';
import { Role } from '../../common/auth/role.enum';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
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

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() body: CreateSubscriberDto, @Req() req: Request & { user?: { id: string } }) {
    return this.subscribersService.create(body, req.user?.id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateSubscriberDto,
    @Req() req: Request & { user?: { id: string } }
  ) {
    return this.subscribersService.update(id, body, req.user?.id);
  }
}
