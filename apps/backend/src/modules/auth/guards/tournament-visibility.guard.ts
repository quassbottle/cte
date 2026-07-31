import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  TournamentException,
  TournamentExceptionCode,
} from 'lib/domain/tournament/tournament.exception';
import { tournamentIdSchema } from 'lib/domain/tournament/tournament.id';
import { DbUser, Schema, tournaments } from 'lib/infrastructure/db';
import { RequestWithAuth } from '../types';

@Injectable()
export class TournamentVisibilityGuard implements CanActivate {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithAuth<DbUser>>();
    const rawId = request.params.tournamentId ?? request.params.id;
    const id = tournamentIdSchema.safeParse(rawId);

    if (request.method !== 'GET' || !id.success) return true;

    const tournament = await this.drizzle.query.tournaments.findFirst({
      where: eq(tournaments.id, id.data),
    });

    if (
      !tournament ||
      (tournament.deletedAt && request.user?.role !== 'admin')
    ) {
      throw new TournamentException(
        'Tournament not found',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
    }

    return true;
  }
}
