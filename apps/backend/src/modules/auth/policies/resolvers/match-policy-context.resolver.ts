import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { MatchId, matchIdSchema } from 'lib/domain/match/match.id';
import {
  TournamentException,
  TournamentExceptionCode,
} from 'lib/domain/tournament/tournament.exception';
import { TournamentId, tournamentIdSchema } from 'lib/domain/tournament/tournament.id';
import { matches, Schema, stages, tournaments } from 'lib/infrastructure/db';
import z from 'zod';
import { PolicyContext, PolicyContextResolver, PolicyRequest } from '../types';

const matchRouteParamsSchema = z.object({
  id: tournamentIdSchema,
});

const directMatchRouteParamsSchema = z.object({ matchId: matchIdSchema });

@Injectable()
export class MatchPolicyContextResolver implements PolicyContextResolver {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  public supports(request: PolicyRequest): boolean {
    const route =
      request.originalUrl ?? request.url ?? request.path ?? request.baseUrl;
    const isTournamentMatchRoute =
      /(^|\/)tournaments\/[^/]+\/matches(\/|$)/.test(route);
    const isDirectMatchSyncRoute = /(^|\/)matches\/[^/]+\/sync(\/|$)/.test(
      route,
    );

    return (
      (isTournamentMatchRoute &&
        ['POST', 'PATCH', 'DELETE'].includes(request.method)) ||
      (isDirectMatchSyncRoute &&
        ['GET', 'POST', 'DELETE'].includes(request.method))
    );
  }

  public async resolve(request: PolicyRequest): Promise<PolicyContext> {
    const directMatchId = directMatchRouteParamsSchema.safeParse(request.params)
      .data?.matchId;
    const tournament = directMatchId
      ? await this.findTournamentByMatch(directMatchId)
      : await this.findTournamentById(
          matchRouteParamsSchema.parse(request.params).id,
        );

    if (tournament.archivedAt) {
      throw new ForbiddenException('Archived tournaments cannot be changed');
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

  private async findTournamentByMatch(matchId: MatchId) {
    const [tournament] = await this.drizzle
      .select({
        creatorId: tournaments.creatorId,
        archivedAt: tournaments.archivedAt,
      })
      .from(matches)
      .innerJoin(stages, eq(stages.id, matches.stageId))
      .innerJoin(
        tournaments,
        and(
          eq(tournaments.id, stages.tournamentId),
          isNull(tournaments.deletedAt),
        ),
      )
      .where(and(eq(matches.id, matchId), isNull(stages.deletedAt)))
      .limit(1);
    if (!tournament) {
      throw new TournamentException(
        'Tournament not found',
        TournamentExceptionCode.TOURNAMENT_NOT_FOUND,
      );
    }
    return tournament;
  }
}
