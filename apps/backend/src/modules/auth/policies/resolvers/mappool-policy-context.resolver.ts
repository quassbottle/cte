import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  MappoolException,
  MappoolExceptionCode,
} from 'lib/domain/mappool/mappool.exception';
import { mappoolIdSchema } from 'lib/domain/mappool/mappool.id';
import {
  StageException,
  StageExceptionCode,
} from 'lib/domain/stage/stage.exception';
import { stageIdSchema } from 'lib/domain/stage/stage.id';
import {
  TournamentException,
  TournamentExceptionCode,
} from 'lib/domain/tournament/tournament.exception';
import {
  TournamentId,
  tournamentIdSchema,
} from 'lib/domain/tournament/tournament.id';
import { Schema, mappools, stages, tournaments } from 'lib/infrastructure/db';
import z from 'zod';
import { PolicyContext, PolicyContextResolver, PolicyRequest } from '../types';

const createMappoolBodySchema = z.object({
  stageId: stageIdSchema,
});

const mappoolParamsSchema = z.object({
  id: mappoolIdSchema,
});

const tournamentMappoolParamsSchema = z.object({
  tournamentId: tournamentIdSchema,
});

@Injectable()
export class MappoolPolicyContextResolver implements PolicyContextResolver {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  public supports(request: PolicyRequest): boolean {
    const route =
      request.originalUrl ?? request.url ?? request.path ?? request.baseUrl;
    const isMappoolRoute = /(^|\/)mappools(\/|$)/.test(route);
    const isManagementRoute = /\/mappools\/manage(?:\/|$)/.test(route);

    return (
      isMappoolRoute &&
      (isManagementRoute ||
        ['POST', 'PATCH', 'DELETE'].includes(request.method))
    );
  }

  public async resolve(request: PolicyRequest): Promise<PolicyContext> {
    const tournament = await this.resolveTournament(request);

    if (tournament.archivedAt) {
      throw new ForbiddenException('Archived tournaments cannot be changed');
    }

    return {
      subject: 'Mappool',
      subjectData: {
        __type: 'Mappool',
        tournamentCreatorId: tournament.creatorId,
      },
    };
  }

  private async resolveTournament(request: PolicyRequest) {
    const mappoolId = mappoolParamsSchema.safeParse(request.params).data?.id;
    if (mappoolId) return this.resolveTournamentByMappoolId(mappoolId);

    const stageId = createMappoolBodySchema.safeParse(request.body).data
      ?.stageId;
    if (stageId) return this.resolveTournamentByStageId(stageId);

    const tournamentId = tournamentMappoolParamsSchema.safeParse(request.params)
      .data?.tournamentId;
    if (tournamentId) return this.resolveTournamentById(tournamentId);

    throw new Error('Tournament, mappool, or stage id is required');
  }

  private async resolveTournamentById(tournamentId: TournamentId) {
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

  private async resolveTournamentByStageId(stageId: unknown) {
    const parsedStageId = stageIdSchema.parse(stageId);

    const [found] = await this.drizzle
      .select({
        creatorId: tournaments.creatorId,
        archivedAt: tournaments.archivedAt,
      })
      .from(stages)
      .innerJoin(
        tournaments,
        and(
          eq(tournaments.id, stages.tournamentId),
          isNull(tournaments.deletedAt),
        ),
      )
      .where(and(eq(stages.id, parsedStageId), isNull(stages.deletedAt)))
      .limit(1);

    if (!found) {
      throw new StageException(
        'Stage not found',
        StageExceptionCode.STAGE_NOT_FOUND,
      );
    }

    return found;
  }

  private async resolveTournamentByMappoolId(mappoolId: unknown) {
    const parsedMappoolId = mappoolIdSchema.parse(mappoolId);

    const [found] = await this.drizzle
      .select({
        creatorId: tournaments.creatorId,
        archivedAt: tournaments.archivedAt,
      })
      .from(mappools)
      .innerJoin(stages, eq(stages.id, mappools.stageId))
      .innerJoin(
        tournaments,
        and(
          eq(tournaments.id, stages.tournamentId),
          isNull(tournaments.deletedAt),
        ),
      )
      .where(and(eq(mappools.id, parsedMappoolId), isNull(stages.deletedAt)))
      .limit(1);

    if (!found) {
      throw new MappoolException(
        'Mappool not found',
        MappoolExceptionCode.MAPPOOL_NOT_FOUND,
      );
    }

    return found;
  }
}
