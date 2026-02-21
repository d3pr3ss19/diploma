import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';
import { Role } from '../../common/auth/role.enum';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestsService } from './requests.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Roles(Role.ADMIN, Role.OPERATOR, Role.SUBSCRIBER)
  @Get()
  list() {
    return this.requestsService.list();
  }

  @Roles(Role.ADMIN, Role.OPERATOR, Role.SUBSCRIBER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.OPERATOR, Role.SUBSCRIBER)
  @Post()
  create(@Body() body: CreateRequestDto) {
    return this.requestsService.create(body);
  }
}
