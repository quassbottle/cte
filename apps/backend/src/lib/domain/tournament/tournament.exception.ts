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
  TOURNAMENT_ACCESS_DENIED = 'TOURNAMENT_ACCESS_DENIED',
  TOURNAMENT_ALREADY_REGISTERED = 'TOURNAMENT_ALREADY_REGISTERED',
  TOURNAMENT_REGISTRATION_NOT_FOUND = 'TOURNAMENT_REGISTRATION_NOT_FOUND',
  TOURNAMENT_INVALID_REGISTRATION_MODE = 'TOURNAMENT_INVALID_REGISTRATION_MODE',
  TOURNAMENT_TEAM_NAME_TAKEN = 'TOURNAMENT_TEAM_NAME_TAKEN',
  TOURNAMENT_PARTICIPANT_ALREADY_IN_TEAM = 'TOURNAMENT_PARTICIPANT_ALREADY_IN_TEAM',
}

const TournamentExceptionHTTPStatus = {
  [TournamentExceptionCode.TOURNAMENT_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [TournamentExceptionCode.TOURNAMENT_ACCESS_DENIED]: HttpStatus.FORBIDDEN,
  [TournamentExceptionCode.TOURNAMENT_ALREADY_REGISTERED]: HttpStatus.CONFLICT,
  [TournamentExceptionCode.TOURNAMENT_REGISTRATION_NOT_FOUND]:
    HttpStatus.NOT_FOUND,
  [TournamentExceptionCode.TOURNAMENT_INVALID_REGISTRATION_MODE]:
    HttpStatus.BAD_REQUEST,
  [TournamentExceptionCode.TOURNAMENT_TEAM_NAME_TAKEN]: HttpStatus.CONFLICT,
  [TournamentExceptionCode.TOURNAMENT_PARTICIPANT_ALREADY_IN_TEAM]:
    HttpStatus.CONFLICT,
};
