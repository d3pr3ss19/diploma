import { Body, Controller, Get, Param, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { AuthGuard } from '../../common/auth/auth.guard';
import { Role } from '../../common/auth/role.enum';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { BillingService } from './billing.service';
import { PayFromBalanceDto } from './dto/pay-from-balance.dto';
import { SubmitReadingDto } from './dto/submit-reading.dto';
import { TopUpDto } from './dto/topup.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Roles(Role.ADMIN, Role.OPERATOR, Role.SUBSCRIBER)
  @Get('regions')
  regions() {
    return this.billingService.listRegions();
  }

  @Roles(Role.ADMIN, Role.OPERATOR, Role.SUBSCRIBER)
  @Get('tariffs')
  tariffs(@Query('region') region = 'Москва') {
    return this.billingService.getTariffs(region);
  }

  @Roles(Role.ADMIN)
  @Get('admin/logs')
  adminLogs(@Query('limit') limit?: string) {
    return this.billingService.listBillingLogsForAdmin(limit ? Number(limit) : undefined);
  }

  @Roles(Role.SUBSCRIBER)
  @Get('notifications/me')
  myNotification(@Req() req: Request & { user?: { id: number } }) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    return this.billingService.getUserPaymentNotification(userId);
  }

  @Roles(Role.ADMIN, Role.OPERATOR, Role.SUBSCRIBER)
  @Get('accounts/:accountId/summary')
  summary(@Param('accountId') accountId: string, @Req() req: Request & { user?: { id: number; role: Role } }) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    return this.billingService.getAccountSummary(accountId, user.id, user.role);
  }

  @Roles(Role.ADMIN, Role.OPERATOR, Role.SUBSCRIBER)
  @Post('accounts/:accountId/readings')
  submitReading(
    @Param('accountId') accountId: string,
    @Body() body: SubmitReadingDto,
    @Req() req: Request & { user?: { id: number; role: Role } },
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    return this.billingService.submitReading(accountId, body, user.id, user.role);
  }

  @Roles(Role.ADMIN, Role.OPERATOR, Role.SUBSCRIBER)
  @Post('accounts/:accountId/top-up')
  topUp(
    @Param('accountId') accountId: string,
    @Body() body: TopUpDto,
    @Req() req: Request & { user?: { id: number; role: Role } },
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    return this.billingService.topUp(accountId, body, user.id, user.role);
  }

  @Roles(Role.ADMIN, Role.OPERATOR, Role.SUBSCRIBER)
  @Post('accounts/:accountId/pay')
  pay(
    @Param('accountId') accountId: string,
    @Body() body: PayFromBalanceDto,
    @Req() req: Request & { user?: { id: number; role: Role } },
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    return this.billingService.payFromBalance(accountId, body, user.id, user.role);
  }
}
