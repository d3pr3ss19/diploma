import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { Request } from 'express';

import { AuthGuard } from '../../common/auth/auth.guard';
import { Role } from '../../common/auth/role.enum';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
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
  deactivateUser(@Param('id', new ParseIntPipe()) id: number, @Req() req: AuthenticatedRequest) {
    return this.authService.deactivateUser(id, req.user?.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('users/:id/activate')
  activateUser(@Param('id', new ParseIntPipe()) id: number, @Req() req: AuthenticatedRequest) {
    return this.authService.activateUser(id, req.user?.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('users/:id')
  deleteUser(@Param('id', new ParseIntPipe()) id: number, @Req() req: AuthenticatedRequest) {
    return this.authService.deleteUser(id, req.user?.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('users/:id/reset-password')
  resetUserPassword(@Param('id', new ParseIntPipe()) id: number, @Req() req: AuthenticatedRequest) {
    return this.authService.resetUserPassword(id, req.user?.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('users/:id/role')
  updateUserRole(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() body: UpdateRoleDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.authService.updateUserRole(id, body, req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  updateMyProfile(@Body() body: UpdateProfileDto, @Req() req: AuthenticatedRequest) {
    return this.authService.updateProfile(req.user?.id, body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('audit-logs')
  listAuditLogs(@Query('section') section?: 'USERS' | 'SUBSCRIBERS' | 'REQUESTS' | 'BILLING') {
    return this.authService.listAuditLogs(section);
  }
}
