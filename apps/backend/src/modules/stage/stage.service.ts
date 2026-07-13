import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  StageException,
  StageExceptionCode,
} from 'lib/domain/stage/stage.exception';
import { StageId, stageId } from 'lib/domain/stage/stage.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { DbStage, Schema, stages } from 'lib/infrastructure/db';
import { StageCreateParams, StageUpdateParams } from './types';

@Injectable()
export class StageService {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  public async create(params: StageCreateParams): Promise<DbStage> {
    const id = stageId();

    if (params.type === 'qualification') {
      await this.assertQualificationAvailable(params.tournamentId);
    }

    try {
      const [created] = await this.drizzle
        .insert(stages)
        .values({ id, ...params })
        .returning();

      return created;
    } catch (error) {
      this.translateQualificationConflict(error);
    }
  }

  public async getById(params: {
    id: StageId;
    tournamentId?: TournamentId;
  }): Promise<DbStage> {
    const { id, tournamentId } = params;

    const stage = await this.drizzle.query.stages.findFirst({
      where: and(
        eq(stages.id, id),
        tournamentId ? eq(stages.tournamentId, tournamentId) : undefined,
        isNull(stages.deletedAt),
      ),
    });

    if (!stage) {
      throw new StageException(
        'Stage not found',
        StageExceptionCode.STAGE_NOT_FOUND,
      );
    }

    return stage;
  }

  public async findByTournament(params: {
    tournamentId: TournamentId;
  }): Promise<DbStage[]> {
    const { tournamentId } = params;

    return this.drizzle.query.stages.findMany({
      where: and(
        eq(stages.tournamentId, tournamentId),
        isNull(stages.deletedAt),
      ),
    });
  }

  public async update(params: {
    id: StageId;
    tournamentId?: TournamentId;
    data: StageUpdateParams;
  }): Promise<DbStage> {
    const {
      id,
      tournamentId,
      data: { startsAt, endsAt, ...rest },
    } = params;

    const current = await this.getById({ id, tournamentId });
    const nextStartsAt = startsAt ?? current.startsAt;
    const nextEndsAt = endsAt ?? current.endsAt;

    if (nextEndsAt <= nextStartsAt) {
      throw new StageException(
        'endsAt must be greater than startsAt',
        StageExceptionCode.STAGE_INVALID_DATES,
      );
    }

    if (rest.type === 'qualification' && current.type !== 'qualification') {
      await this.assertQualificationAvailable(current.tournamentId);
    }

    let updated: DbStage | undefined;
    try {
      [updated] = await this.drizzle
        .update(stages)
        .set({ ...rest, startsAt, endsAt })
        .where(
          and(
            eq(stages.id, id),
            tournamentId ? eq(stages.tournamentId, tournamentId) : undefined,
            isNull(stages.deletedAt),
          ),
        )
        .returning();
    } catch (error) {
      this.translateQualificationConflict(error);
    }

    if (!updated) {
      throw new StageException(
        'Stage not found',
        StageExceptionCode.STAGE_NOT_FOUND,
      );
    }

    return updated;
  }

  public async softDelete(params: {
    id: StageId;
    tournamentId?: TournamentId;
  }): Promise<DbStage> {
    const { id, tournamentId } = params;

    const [deleted] = await this.drizzle
      .update(stages)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(stages.id, id),
          tournamentId ? eq(stages.tournamentId, tournamentId) : undefined,
          isNull(stages.deletedAt),
        ),
      )
      .returning();

    if (!deleted) {
      throw new StageException(
        'Stage not found',
        StageExceptionCode.STAGE_NOT_FOUND,
      );
    }

    return deleted;
  }

  private async assertQualificationAvailable(
    tournamentId: TournamentId,
  ): Promise<void> {
    const existing = await this.drizzle.query.stages.findFirst({
      where: and(
        eq(stages.tournamentId, tournamentId),
        eq(stages.type, 'qualification'),
        isNull(stages.deletedAt),
      ),
    });

    if (existing) this.throwQualificationConflict();
  }

  private translateQualificationConflict(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505' &&
      'constraint' in error &&
      error.constraint === 'stages_one_qualification_per_tournament'
    ) {
      this.throwQualificationConflict();
    }

    throw error;
  }

  private throwQualificationConflict(): never {
    throw new StageException(
      'Tournament already has a qualification stage',
      StageExceptionCode.STAGE_QUALIFICATION_EXISTS,
    );
  }
}
