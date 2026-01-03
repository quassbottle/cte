import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../shared/exception';

export class UserException extends DomainException {
  constructor(message: string, internalErrorCode: UserExceptionCode) {
    super(
      message,
      UserExceptionHTTPStatus[internalErrorCode],
      internalErrorCode,
    );
  }
}

export enum UserExceptionCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
}

const UserExceptionHTTPStatus = {
  [UserExceptionCode.USER_NOT_FOUND]: HttpStatus.NOT_FOUND,
};
