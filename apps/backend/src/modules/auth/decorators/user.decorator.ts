import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { DbUser as UserEntity } from 'lib/infrastructure/db';
import { RequestWithAuth } from '../types';

export const RequestUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity => {
    const request = ctx
      .switchToHttp()
      .getRequest<RequestWithAuth<UserEntity>>();

    if (!request.user) {
      throw new UnauthorizedException('User not found in request');
    }

    return request.user;
  },
);
