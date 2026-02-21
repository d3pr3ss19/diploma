import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { RequestsModule } from './modules/requests/requests.module';
import { SubscribersModule } from './modules/subscribers/subscribers.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, SubscribersModule, RequestsModule],
  controllers: [HealthController]
})
export class AppModule {}
