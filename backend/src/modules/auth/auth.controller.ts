import { Body, Controller, Delete, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { AuthGuard } from '../../common/auth/auth.guard';
import { Role } from '../../common/auth/role.enum';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: Role;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  logout(@Body() body: LogoutDto) {
    return this.authService.logout(body.refreshToken);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('users/:id/deactivate')
  deactivateUser(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    return this.authService.deactivateUser(id, req.user?.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('users/:id/activate')
  activateUser(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    return this.authService.activateUser(id, req.user?.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('users/:id')
  deleteUser(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    return this.authService.deleteUser(id, req.user?.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('users/:id/reset-password')
  resetUserPassword(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    return this.authService.resetUserPassword(id, req.user?.id);
  }
}
