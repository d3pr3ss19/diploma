import { Body, Controller, Get, Param, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { AuthGuard } from '../../common/auth/auth.guard';
import { Role } from '../../common/auth/role.enum';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestsService } from './requests.service';
import { UpdateRequestDto } from './dto/update-request.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Roles(Role.ADMIN, Role.OPERATOR, Role.SUBSCRIBER)
  @Get()
  list(@Req() req: Request & { user?: { id: number; role: Role } }) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    return this.requestsService.list(user.id, user.role);
  }

  @Roles(Role.ADMIN, Role.OPERATOR, Role.SUBSCRIBER)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { user?: { id: number; role: Role } }) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    return this.requestsService.findOne(id, user.id, user.role);
  }

  @Roles(Role.ADMIN, Role.OPERATOR, Role.SUBSCRIBER)
  @Get(':id/history')
  history(@Param('id') id: string, @Req() req: Request & { user?: { id: number; role: Role } }) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    return this.requestsService.history(id, user.id, user.role);
  }

  @Roles(Role.ADMIN, Role.OPERATOR, Role.SUBSCRIBER)
  @Post()
  create(@Body() body: CreateRequestDto, @Req() req: Request & { user?: { id: number; role: Role } }) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    return this.requestsService.create(body, user.id, user.role);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateRequestDto,
    @Req() req: Request & { user?: { id: number } }
  ) {
    const changedByUserId = req.user?.id;
    if (!changedByUserId) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    return this.requestsService.update(id, body, changedByUserId);
  }
}
