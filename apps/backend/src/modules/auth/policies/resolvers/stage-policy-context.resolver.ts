import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  StageException,
  StageExceptionCode,
} from 'lib/domain/stage/stage.exception';
import { stageIdSchema } from 'lib/domain/stage/stage.id';
import {
  TournamentException,
  TournamentExceptionCode,
} from 'lib/domain/tournament/tournament.exception';
import { tournamentIdSchema } from 'lib/domain/tournament/tournament.id';
import { Schema, stages, tournaments } from 'lib/infrastructure/db';
import z from 'zod';
import { PolicyContext, PolicyContextResolver, PolicyRequest } from '../types';

const stageRouteParamsSchema = z.object({
  tournamentId: tournamentIdSchema,
});

@Injectable()
export class StagePolicyContextResolver implements PolicyContextResolver {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  public supports(request: PolicyRequest): boolean {
    const route =
      request.originalUrl ?? request.url ?? request.path ?? request.baseUrl;
    const isStageRoute = /(^|\/)stages(\/|$)/.test(route);

    return isStageRoute && ['POST', 'PATCH', 'DELETE'].includes(request.method);
  }

  public async resolve(request: PolicyRequest): Promise<PolicyContext> {
    const tournamentId =
      request.method === 'POST'
        ? stageRouteParamsSchema.parse(request.params).tournamentId
        : await this.resolveTournamentIdByStageId(request.params.id);

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

    return {
      subject: 'Stage',
      subjectData: {
        __type: 'Stage',
        tournamentCreatorId: tournament.creatorId,
      },
    };
  }

  private async resolveTournamentIdByStageId(rawStageId: unknown) {
    const stageId = stageIdSchema.parse(rawStageId);

    const stage = await this.drizzle.query.stages.findFirst({
      where: and(eq(stages.id, stageId), isNull(stages.deletedAt)),
    });

    if (!stage) {
      throw new StageException(
        'Stage not found',
        StageExceptionCode.STAGE_NOT_FOUND,
      );
    }

    return stage.tournamentId;
  }
}
