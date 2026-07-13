import { Controller, Get, Post, Query } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import { AuthService } from './auth.service';
import { AuthTokenDto, AuthUrlDto, LoginDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('auth-callback')
  @ZodResponse({
    status: 200,
    description: 'Returns the application session token.',
    type: AuthTokenDto,
  })
  public async authCallback(@Query() body: LoginDto): Promise<AuthTokenDto> {
    return this.authService.login(body);
  }

  @Post('init-login')
  @ZodResponse({
    status: 200,
    description: 'Returns the osu! OAuth authorization URL.',
    type: AuthUrlDto,
  })
  public initLogin(): AuthUrlDto {
    return this.authService.getAuthUrl();
  }
}
