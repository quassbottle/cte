import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import {
  TournamentId,
  tournamentIdSchema,
} from 'lib/domain/tournament/tournament.id';

@Injectable()
export class TournamentIdPipe implements PipeTransform<string, TournamentId> {
  public transform(value: string): TournamentId {
    const parsed = tournamentIdSchema.safeParse(value);

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => issue.message)
        .join('; ');
      throw new BadRequestException(message || 'Invalid tournament id');
    }

    return parsed.data;
  }
}
