import { Injectable } from '@nestjs/common';
import { matchIdSchema } from 'lib/domain/match/match.id';
import { createValidationPipe } from './create-validation-pipe';

@Injectable()
export class MatchIdPipe extends createValidationPipe(matchIdSchema, 'match') {}
