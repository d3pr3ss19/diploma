import { Body, Controller, Post } from '@nestjs/common';

import { Role } from '../../common/auth/role.enum';

type LoginDto = {
  email: string;
  password: string;
  role?: Role;
};

@Controller('auth')
export class AuthController {
  @Post('login')
  login(@Body() body: LoginDto) {
    const role = body.role ?? Role.OPERATOR;
    const userId = 'stub-user-id';

    return {
      accessToken: `demo-${role}-${userId}`,
      refreshToken: `demo-refresh-${userId}`,
      user: {
        id: userId,
        email: body.email,
        role
      }
    };
  }

  @Post('refresh')
  refresh() {
    return { accessToken: `demo-${Role.OPERATOR}-stub-user-id` };
  }

  @Post('logout')
  logout() {
    return { success: true };
  }
}
