import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../shared/exception';

export class MappoolException extends DomainException {
  constructor(message: string, internalErrorCode: MappoolExceptionCode) {
    super(
      message,
      MappoolExceptionHTTPStatus[internalErrorCode],
      internalErrorCode,
    );
  }
}

export enum MappoolExceptionCode {
  MAPPOOL_NOT_FOUND = 'MAPPOOL_NOT_FOUND',
  MAPPOOL_INVALID_DATES = 'MAPPOOL_INVALID_DATES',
  MAPPOOL_ACCESS_DENIED = 'MAPPOOL_ACCESS_DENIED',
  MAPPOOL_BEATMAP_NOT_FOUND = 'MAPPOOL_BEATMAP_NOT_FOUND',
  MAPPOOL_BEATMAP_ALREADY_EXISTS = 'MAPPOOL_BEATMAP_ALREADY_EXISTS',
  MAPPOOL_BEATMAP_INVALID = 'MAPPOOL_BEATMAP_INVALID',
  MAPPOOL_BEATMAP_INDEX_CONFLICT = 'MAPPOOL_BEATMAP_INDEX_CONFLICT',
}

const MappoolExceptionHTTPStatus = {
  [MappoolExceptionCode.MAPPOOL_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [MappoolExceptionCode.MAPPOOL_INVALID_DATES]: HttpStatus.BAD_REQUEST,
  [MappoolExceptionCode.MAPPOOL_ACCESS_DENIED]: HttpStatus.FORBIDDEN,
  [MappoolExceptionCode.MAPPOOL_BEATMAP_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [MappoolExceptionCode.MAPPOOL_BEATMAP_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [MappoolExceptionCode.MAPPOOL_BEATMAP_INVALID]: HttpStatus.BAD_REQUEST,
  [MappoolExceptionCode.MAPPOOL_BEATMAP_INDEX_CONFLICT]: HttpStatus.CONFLICT,
};
