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
  TOURNAMENT_NOT_FOUND = 'TOURNAMENT_NOT_FOUND',
}

const TournamentExceptionHTTPStatus = {
  [TournamentExceptionCode.TOURNAMENT_NOT_FOUND]: HttpStatus.NOT_FOUND,
};
