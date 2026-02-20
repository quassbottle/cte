import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../shared/exception';

export class TournamentException extends DomainException {
  constructor(message: string, internalErrorCode: TournamentExceptionCode) {
    super(
      message,
      TournamentExceptionHTTPStatus[internalErrorCode],
      internalErrorCode,
    );
  }
}

export enum TournamentExceptionCode {
  ALREADY_PARTICIPATING = 'ALREADY_PARTICIPATING',
}

const TournamentExceptionHTTPStatus = {
  [TournamentExceptionCode.ALREADY_PARTICIPATING]: HttpStatus.CONFLICT,
};
