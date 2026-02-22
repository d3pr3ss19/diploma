import { Module } from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { SubscribersController } from './subscribers.controller';
import { SubscribersService } from './subscribers.service';

@Module({
  controllers: [SubscribersController],
  providers: [SubscribersService, AuthGuard, RolesGuard]
})
export class SubscribersModule {}
