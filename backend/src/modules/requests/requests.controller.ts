import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
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

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Get()
  list() {
    return this.requestsService.list();
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.requestsService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Get(':id/history')
  history(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.requestsService.history(id);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Post()
  create(@Body() body: CreateRequestDto, @Req() req: Request & { user?: { id: string } }) {
    const createdByUserId = req.user?.id;
    if (!createdByUserId) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    return this.requestsService.create(body, createdByUserId);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateRequestDto,
    @Req() req: Request & { user?: { id: string } }
  ) {
    const changedByUserId = req.user?.id;
    if (!changedByUserId) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    return this.requestsService.update(id, body, changedByUserId);
  }
}
