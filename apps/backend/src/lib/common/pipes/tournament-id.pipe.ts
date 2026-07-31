import { Injectable } from '@nestjs/common';
import { tournamentIdSchema } from 'lib/domain/tournament/tournament.id';
import { createValidationPipe } from './create-validation-pipe';

@Injectable()
export class TournamentIdPipe extends createValidationPipe(
  tournamentIdSchema,
  'tournament',
) {}
