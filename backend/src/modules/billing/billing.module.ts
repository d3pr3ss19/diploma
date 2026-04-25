import { Module } from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, AuthGuard, RolesGuard],
})
export class BillingModule {}
