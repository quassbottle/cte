import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('auth-callback')
  @ApiOkResponse({ description: 'User logged in successfully' })
  public async authCallback(@Query() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('init-login')
  @ApiOkResponse({ description: 'User logged in successfully' })
  public initLogin() {
    return this.authService.getAuthUrl();
  }
}
