import { Body, Controller, Post } from '@nestjs/common';

type LoginDto = {
  email: string;
  password: string;
};

@Controller('auth')
export class AuthController {
  @Post('login')
  login(@Body() body: LoginDto) {
    return {
      accessToken: 'stub-access-token',
      refreshToken: 'stub-refresh-token',
      user: {
        id: 'stub-user-id',
        email: body.email,
        role: 'OPERATOR'
      }
    };
  }

  @Post('refresh')
  refresh() {
    return { accessToken: 'stub-access-token' };
  }

  @Post('logout')
  logout() {
    return { success: true };
  }
}
