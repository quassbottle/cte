import { ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtUserGuard } from './jwt.guard';

@Injectable()
export class OptionalJwtUserGuard extends JwtUserGuard {
  public canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    return request.headers.authorization ? super.canActivate(context) : true;
  }
}
