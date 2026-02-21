import { Inject, Injectable } from '@nestjs/common';
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
import { Schema, mappools, stages, tournaments } from 'lib/infrastructure/db';
import z from 'zod';
import { PolicyContext, PolicyContextResolver, PolicyRequest } from '../types';

const createMappoolBodySchema = z.object({
  stageId: stageIdSchema,
});

const mappoolParamsSchema = z.object({
  id: mappoolIdSchema,
});

@Injectable()
export class MappoolPolicyContextResolver implements PolicyContextResolver {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  public supports(request: PolicyRequest): boolean {
    const route =
      request.originalUrl ?? request.url ?? request.path ?? request.baseUrl;
    const isMappoolRoute = /(^|\/)mappools(\/|$)/.test(route);

    return (
      isMappoolRoute && ['POST', 'PATCH', 'DELETE'].includes(request.method)
    );
  }

  public async resolve(request: PolicyRequest): Promise<PolicyContext> {
    const tournamentCreatorId = await this.resolveTournamentCreatorId(request);

    return {
      subject: 'Mappool',
      subjectData: {
        __type: 'Mappool',
        tournamentCreatorId,
      },
    };
  }

  private async resolveTournamentCreatorId(request: PolicyRequest) {
    const mappoolId = mappoolParamsSchema.safeParse(request.params).data?.id;

    if (mappoolId) {
      return this.resolveTournamentCreatorIdByMappoolId(mappoolId);
    }

    if (request.method === 'POST') {
      return this.resolveTournamentCreatorIdByStageId(
        createMappoolBodySchema.parse(request.body).stageId,
      );
    }

    throw new Error('Mappool id is required');
  }

  private async resolveTournamentCreatorIdByStageId(stageId: unknown) {
    const parsedStageId = stageIdSchema.parse(stageId);

    const [found] = await this.drizzle
      .select({ tournamentCreatorId: tournaments.creatorId })
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

    return found.tournamentCreatorId;
  }

  private async resolveTournamentCreatorIdByMappoolId(mappoolId: unknown) {
    const parsedMappoolId = mappoolIdSchema.parse(mappoolId);

    const [found] = await this.drizzle
      .select({ tournamentCreatorId: tournaments.creatorId })
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

    return found.tournamentCreatorId;
  }
}
