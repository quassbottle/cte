import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../shared/exception';

export class StageException extends DomainException {
  constructor(message: string, internalErrorCode: StageExceptionCode) {
    super(
      message,
      StageExceptionHTTPStatus[internalErrorCode],
      internalErrorCode,
    );
  }
}

export enum StageExceptionCode {
  STAGE_NOT_FOUND = 'STAGE_NOT_FOUND',
  STAGE_INVALID_DATES = 'STAGE_INVALID_DATES',
  STAGE_ACCESS_DENIED = 'STAGE_ACCESS_DENIED',
}

const StageExceptionHTTPStatus = {
  [StageExceptionCode.STAGE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [StageExceptionCode.STAGE_INVALID_DATES]: HttpStatus.BAD_REQUEST,
  [StageExceptionCode.STAGE_ACCESS_DENIED]: HttpStatus.FORBIDDEN,
};
