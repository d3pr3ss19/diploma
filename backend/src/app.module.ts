import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { RequestsModule } from './modules/requests/requests.module';
import { SubscribersModule } from './modules/subscribers/subscribers.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, SubscribersModule, RequestsModule, BillingModule],
  controllers: [HealthController]
})
export class AppModule {}
