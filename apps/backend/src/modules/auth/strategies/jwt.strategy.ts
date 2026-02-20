import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { EnvService } from 'lib/common/env/env.service';
import { UserId } from 'lib/domain/user/user.id';
import { UserService } from 'modules/user/user.service';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-user-guard') {
  constructor(
    env: EnvService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.get('JWT_SECRET'),
    });
  }

  public async validate({ id }: TokenPayload) {
    if (!id) {
      throw new UnauthorizedException('Missing user payload');
    }

    return this.userService.getById({ id: id as UserId });
  }
}
