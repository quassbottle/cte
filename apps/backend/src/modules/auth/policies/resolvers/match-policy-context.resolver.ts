import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  TournamentException,
  TournamentExceptionCode,
} from 'lib/domain/tournament/tournament.exception';
import {
  TournamentId,
  tournamentIdSchema,
} from 'lib/domain/tournament/tournament.id';
import { Schema, tournaments } from 'lib/infrastructure/db';
import z from 'zod';
import { PolicyContext, PolicyContextResolver, PolicyRequest } from '../types';

const matchRouteParamsSchema = z.object({
  id: tournamentIdSchema,
});

@Injectable()
export class MatchPolicyContextResolver implements PolicyContextResolver {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  public supports(request: PolicyRequest): boolean {
    const route =
      request.originalUrl ?? request.url ?? request.path ?? request.baseUrl;
    const isTournamentMatchRoute =
      /(^|\/)tournaments\/[^/]+\/matches(\/|$)/.test(route);
    return (
      isTournamentMatchRoute &&
      ['POST', 'PATCH', 'DELETE'].includes(request.method)
    );
  }

  public async resolve(request: PolicyRequest): Promise<PolicyContext> {
    const tournament = await this.findTournamentById(
      matchRouteParamsSchema.parse(request.params).id,
    );

    if (tournament.archivedAt) {
      throw new TournamentException(
        'Archived tournaments cannot be changed',
        TournamentExceptionCode.TOURNAMENT_ACCESS_DENIED,
      );
    }

    return {
      subject: 'Match',
      subjectData: {
        __type: 'Match',
        tournamentCreatorId: tournament.creatorId,
      },
    };
  }

  private async findTournamentById(tournamentId: TournamentId) {
    const tournament = await this.drizzle.query.tournaments.findFirst({
      where: and(
        eq(tournaments.id, tournamentId),
        isNull(tournaments.deletedAt),
      ),
    });

    if (!tournament) {
      throw new TournamentException(
        'Tournament not found',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
    }

    return tournament;
  }
}
