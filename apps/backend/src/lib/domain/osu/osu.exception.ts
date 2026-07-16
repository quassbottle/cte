import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../shared/exception';

export class OsuException extends DomainException {
  constructor(message: string, code: OsuExceptionCode) {
    super(message, OsuExceptionHTTPStatus[code], code);
  }
}

export enum OsuExceptionCode {
  BEATMAP_NOT_FOUND = 'OSU_BEATMAP_NOT_FOUND',
  BEATMAP_PERSISTENCE_FAILED = 'OSU_BEATMAP_PERSISTENCE_FAILED',
}

const OsuExceptionHTTPStatus = {
  [OsuExceptionCode.BEATMAP_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [OsuExceptionCode.BEATMAP_PERSISTENCE_FAILED]:
    HttpStatus.INTERNAL_SERVER_ERROR,
};
