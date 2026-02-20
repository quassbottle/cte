import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { PaginationParams } from 'lib/common/utils/zod/pagination';
import {
  MappoolException,
  MappoolExceptionCode,
} from 'lib/domain/mappool/mappool.exception';
import { MappoolId, mappoolId } from 'lib/domain/mappool/mappool.id';
import { BeatmapId } from 'lib/domain/beatmap/beatmap.id';
import {
  StageException,
  StageExceptionCode,
} from 'lib/domain/stage/stage.exception';
import { StageId } from 'lib/domain/stage/stage.id';
import {
  DbMappool,
  DbMappoolsBeatmaps,
  Schema,
  beatmaps,
  mappools,
  mappoolsBeatmaps,
  stages,
} from 'lib/infrastructure/db';
import { MappoolCreateParams, MappoolUpdateParams } from './types';

@Injectable()
export class MappoolService {
  constructor(@Inject('DB') private readonly drizzle: Schema) {}

  public async create(params: MappoolCreateParams): Promise<DbMappool> {
    const { startsAt, endsAt, stageId } = params;
    const id = mappoolId();

    if (endsAt <= startsAt) {
      throw new MappoolException(
        'endsAt must be greater than startsAt',
        MappoolExceptionCode.MAPPOOL_INVALID_DATES,
      );
    }

    await this.assertStageExists({ stageId });

    const [created] = await this.drizzle
      .insert(mappools)
      .values({ id, ...params })
      .returning();

    return created;
  }

  public async getById(params: { id: MappoolId }): Promise<DbMappool> {
    const { id } = params;

    const mappool = await this.drizzle.query.mappools.findFirst({
      where: eq(mappools.id, id),
    });

    if (!mappool) {
      throw new MappoolException(
        'Mappool not found',
        MappoolExceptionCode.MAPPOOL_NOT_FOUND,
      );
    }

    return mappool;
  }

  public async findMany(params: PaginationParams): Promise<DbMappool[]> {
    const { limit, offset } = params;

    const found = await this.drizzle.query.mappools.findMany({ limit, offset });

    return found;
  }

  public async update(params: {
    id: MappoolId;
    data: MappoolUpdateParams;
  }): Promise<DbMappool> {
    const {
      id,
      data: { startsAt, endsAt },
    } = params;

    const current = await this.getById({ id });

    const nextStartsAt = startsAt ?? current.startsAt;
    const nextEndsAt = endsAt ?? current.endsAt;

    if (nextEndsAt <= nextStartsAt) {
      throw new MappoolException(
        'endsAt must be greater than startsAt',
        MappoolExceptionCode.MAPPOOL_INVALID_DATES,
      );
    }

    const [updated] = await this.drizzle
      .update(mappools)
      .set({ startsAt, endsAt })
      .where(eq(mappools.id, id))
      .returning();

    if (!updated) {
      throw new MappoolException(
        'Mappool not found',
        MappoolExceptionCode.MAPPOOL_NOT_FOUND,
      );
    }

    return updated;
  }

  public async delete(params: { id: MappoolId }): Promise<DbMappool> {
    const { id } = params;

    const [deleted] = await this.drizzle
      .delete(mappools)
      .where(eq(mappools.id, id))
      .returning();

    if (!deleted) {
      throw new MappoolException(
        'Mappool not found',
        MappoolExceptionCode.MAPPOOL_NOT_FOUND,
      );
    }

    return deleted;
  }

  public async addBeatmap(params: {
    id: MappoolId;
    beatmapId: BeatmapId;
  }): Promise<DbMappoolsBeatmaps> {
    const { id, beatmapId } = params;

    await this.getById({ id });
    await this.assertBeatmapExists({ beatmapId });
    await this.assertBeatmapNotInMappool({ id, beatmapId });

    const [created] = await this.drizzle
      .insert(mappoolsBeatmaps)
      .values({ mappoolId: id, beatmapId })
      .returning();

    return created;
  }

  private async assertStageExists(params: {
    stageId: StageId;
  }): Promise<void> {
    const { stageId } = params;

    const stage = await this.drizzle.query.stages.findFirst({
      where: and(eq(stages.id, stageId), isNull(stages.deletedAt)),
    });

    if (!stage) {
      throw new StageException(
        'Stage not found',
        StageExceptionCode.STAGE_NOT_FOUND,
      );
    }
  }

  private async assertBeatmapExists(params: { beatmapId: BeatmapId }) {
    const { beatmapId } = params;

    const beatmap = await this.drizzle.query.beatmaps.findFirst({
      where: eq(beatmaps.id, beatmapId),
    });

    if (!beatmap) {
      throw new MappoolException(
        'Beatmap not found',
        MappoolExceptionCode.MAPPOOL_BEATMAP_NOT_FOUND,
      );
    }
  }

  private async assertBeatmapNotInMappool(params: {
    id: MappoolId;
    beatmapId: BeatmapId;
  }) {
    const { id, beatmapId } = params;

    const mappoolBeatmap = await this.drizzle.query.mappoolsBeatmaps.findFirst({
      where: and(
        eq(mappoolsBeatmaps.mappoolId, id),
        eq(mappoolsBeatmaps.beatmapId, beatmapId),
      ),
    });

    if (mappoolBeatmap) {
      throw new MappoolException(
        'Beatmap is already in mappool',
        MappoolExceptionCode.MAPPOOL_BEATMAP_ALREADY_EXISTS,
      );
    }
  }
}
