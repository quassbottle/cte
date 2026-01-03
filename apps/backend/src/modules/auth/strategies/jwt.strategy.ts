import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { EnvService } from 'lib/common/env/env.service';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-user-guard') {
  constructor(env: EnvService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.get('JWT_SECRET'),
    });
  }

  public validate({ id }: TokenPayload) {
    return { id };
  }
}
