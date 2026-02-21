import { Module } from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  controllers: [RequestsController],
  providers: [RequestsService, AuthGuard, RolesGuard]
})
export class RequestsModule {}
