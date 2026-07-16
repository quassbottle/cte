import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../shared/exception';

export class QualificationLobbyException extends DomainException {
  constructor(message: string, code: QualificationLobbyExceptionCode) {
    super(message, QualificationLobbyExceptionHTTPStatus[code], code);
  }
}

export enum QualificationLobbyExceptionCode {
  LOBBY_FULL = 'QUALIFICATION_LOBBY_FULL',
}

const QualificationLobbyExceptionHTTPStatus = {
  [QualificationLobbyExceptionCode.LOBBY_FULL]: HttpStatus.CONFLICT,
};
