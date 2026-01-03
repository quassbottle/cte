import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserId } from 'lib/domain/user/user.id';
import { DbUser } from 'lib/infrastructure/db';
import { UserService } from 'modules/user/user.service';
import { RequestWithAuth, TokenPayload } from '../types';

@Injectable()
export class JwtUserGuard extends AuthGuard('jwt-user-guard') {
  constructor(private readonly userService: UserService) {
    super();
  }

  public override async canActivate(context: ExecutionContext) {
    await super.canActivate(context);

    const request = context
      .switchToHttp()
      .getRequest<RequestWithAuth<DbUser>>();
    const payload = request.user as TokenPayload | undefined;

    if (!payload?.id) {
      throw new UnauthorizedException('Missing user payload');
    }

    const user = await this.userService.getById({ id: payload.id as UserId });

    request.user = user;

    return true;
  }
}
