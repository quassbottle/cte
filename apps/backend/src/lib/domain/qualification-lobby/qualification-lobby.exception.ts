import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../shared/exception';

export class QualificationLobbyException extends DomainException {
  constructor(message: string, code: QualificationLobbyExceptionCode) {
    super(message, QualificationLobbyExceptionHTTPStatus[code], code);
  }
}

export enum QualificationLobbyExceptionCode {
  LOBBY_FULL = 'QUALIFICATION_LOBBY_FULL',
  LOBBY_NOT_FOUND = 'QUALIFICATION_LOBBY_NOT_FOUND',
  LOBBY_ROOM_REQUIRED = 'QUALIFICATION_LOBBY_ROOM_REQUIRED',
  LOBBY_PARTICIPANT_INACTIVE = 'QUALIFICATION_LOBBY_PARTICIPANT_INACTIVE',
  LOBBY_TEAM_INACTIVE = 'QUALIFICATION_LOBBY_TEAM_INACTIVE',
  LOBBY_TEAM_CAPTAIN_REQUIRED = 'QUALIFICATION_LOBBY_TEAM_CAPTAIN_REQUIRED',
  LOBBY_TEAM_EMPTY = 'QUALIFICATION_LOBBY_TEAM_EMPTY',
  LOBBY_STAGE_INVALID = 'QUALIFICATION_LOBBY_STAGE_INVALID',
  LOBBY_REFEREE_INVALID = 'QUALIFICATION_LOBBY_REFEREE_INVALID',
  LOBBY_STAFF_CANNOT_PARTICIPATE = 'QUALIFICATION_LOBBY_STAFF_CANNOT_PARTICIPATE',
}

const QualificationLobbyExceptionHTTPStatus = {
  [QualificationLobbyExceptionCode.LOBBY_FULL]: HttpStatus.CONFLICT,
  [QualificationLobbyExceptionCode.LOBBY_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [QualificationLobbyExceptionCode.LOBBY_TEAM_CAPTAIN_REQUIRED]:
    HttpStatus.FORBIDDEN,
  [QualificationLobbyExceptionCode.LOBBY_ROOM_REQUIRED]: HttpStatus.BAD_REQUEST,
  [QualificationLobbyExceptionCode.LOBBY_PARTICIPANT_INACTIVE]:
    HttpStatus.BAD_REQUEST,
  [QualificationLobbyExceptionCode.LOBBY_TEAM_INACTIVE]:
    HttpStatus.BAD_REQUEST,
  [QualificationLobbyExceptionCode.LOBBY_TEAM_EMPTY]: HttpStatus.BAD_REQUEST,
  [QualificationLobbyExceptionCode.LOBBY_STAGE_INVALID]: HttpStatus.BAD_REQUEST,
  [QualificationLobbyExceptionCode.LOBBY_REFEREE_INVALID]:
    HttpStatus.BAD_REQUEST,
  [QualificationLobbyExceptionCode.LOBBY_STAFF_CANNOT_PARTICIPATE]:
    HttpStatus.BAD_REQUEST,
};
