import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../shared/exception';

export class MatchException extends DomainException {
  constructor(message: string, internalErrorCode: MatchExceptionCode) {
    super(
      message,
      MatchExceptionHTTPStatus[internalErrorCode],
      internalErrorCode,
    );
  }
}

export enum MatchExceptionCode {
  MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',
  PARTICIPANT_NOT_FOUND = 'PARTICIPANT_NOT_FOUND',
  ALREADY_PARTICIPATING = 'ALREADY_PARTICIPATING',
  MATCH_ACCESS_DENIED = 'MATCH_ACCESS_DENIED',
}

const MatchExceptionHTTPStatus = {
  [MatchExceptionCode.MATCH_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [MatchExceptionCode.PARTICIPANT_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [MatchExceptionCode.ALREADY_PARTICIPATING]: HttpStatus.CONFLICT,
  [MatchExceptionCode.MATCH_ACCESS_DENIED]: HttpStatus.FORBIDDEN,
};
