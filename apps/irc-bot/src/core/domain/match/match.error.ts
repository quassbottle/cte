import { DomainError } from '../shared/domain.error';

export class MatchError extends DomainError {
  constructor(message: string, internalErrorCode: MatchErrorCode) {
    super(message, internalErrorCode);
  }
}

export enum MatchErrorCode {
  MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',
  PARTICIPANT_NOT_FOUND = 'PARTICIPANT_NOT_FOUND',
  ALREADY_PARTICIPATING = 'ALREADY_PARTICIPATING',
}
