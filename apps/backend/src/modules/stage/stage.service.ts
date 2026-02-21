import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { PaginationParams } from 'lib/common/utils/zod/pagination';
import {
  StageException,
  StageExceptionCode,
} from 'lib/domain/stage/stage.exception';
import { StageId, stageId } from 'lib/domain/stage/stage.id';
import { DbStage, Schema, stages } from 'lib/infrastructure/db';
import { StageCreateParams, StageUpdateParams } from './types';

@Injectable()
export class StageService {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  public async create(params: StageCreateParams): Promise<DbStage> {
    const id = stageId();

    const [created] = await this.drizzle
      .insert(stages)
      .values({ id, ...params })
      .returning();

    return created;
  }

  public async getById(params: { id: StageId }): Promise<DbStage> {
    const { id } = params;

    const stage = await this.drizzle.query.stages.findFirst({
      where: and(eq(stages.id, id), isNull(stages.deletedAt)),
    });

    if (!stage) {
      throw new StageException(
        'Stage not found',
        StageExceptionCode.STAGE_NOT_FOUND,
      );
    }

    return stage;
  }

  public async findMany(params: PaginationParams): Promise<DbStage[]> {
    const { limit, offset } = params;

    const found = await this.drizzle.query.stages.findMany({
      where: isNull(stages.deletedAt),
      limit,
      offset,
    });

    return found;
  }

  public async update(params: {
    id: StageId;
    data: StageUpdateParams;
  }): Promise<DbStage> {
    const {
      id,
      data: { startsAt, endsAt, ...rest },
    } = params;

    const current = await this.getById({ id });
    const nextStartsAt = startsAt ?? current.startsAt;
    const nextEndsAt = endsAt ?? current.endsAt;

    if (nextEndsAt <= nextStartsAt) {
      throw new StageException(
        'endsAt must be greater than startsAt',
        StageExceptionCode.STAGE_INVALID_DATES,
      );
    }

    const [updated] = await this.drizzle
      .update(stages)
      .set({ ...rest, startsAt, endsAt })
      .where(and(eq(stages.id, id), isNull(stages.deletedAt)))
      .returning();

    if (!updated) {
      throw new StageException(
        'Stage not found',
        StageExceptionCode.STAGE_NOT_FOUND,
      );
    }

    return updated;
  }

  public async softDelete(params: { id: StageId }): Promise<DbStage> {
    const { id } = params;

    const [deleted] = await this.drizzle
      .update(stages)
      .set({ deletedAt: new Date() })
      .where(and(eq(stages.id, id), isNull(stages.deletedAt)))
      .returning();

    if (!deleted) {
      throw new StageException(
        'Stage not found',
        StageExceptionCode.STAGE_NOT_FOUND,
      );
    }

    return deleted;
  }
}
