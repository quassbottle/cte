import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { EnvService } from 'lib/common/env/env.service';
import { TokenPayload } from './types';

@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly env: EnvService,
  ) {}

  public async signJwtToken(params: { id: string }) {
    const { id } = params;

    const payload: TokenPayload = { id };

    const token = await this.jwtService.signAsync(payload, {
      secret: this.env.get('JWT_SECRET'),
      expiresIn: this.env.get('JWT_EXPIRES_IN'),
    });

    return { token };
  }
}
