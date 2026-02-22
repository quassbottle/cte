import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, max, ne } from 'drizzle-orm';
import { PaginationParams } from 'lib/common/utils/zod/pagination';
import { BeatmapId } from 'lib/domain/beatmap/beatmap.id';
import {
  MappoolException,
  MappoolExceptionCode,
} from 'lib/domain/mappool/mappool.exception';
import { MappoolId, mappoolId } from 'lib/domain/mappool/mappool.id';
import {
  StageException,
  StageExceptionCode,
} from 'lib/domain/stage/stage.exception';
import { StageId } from 'lib/domain/stage/stage.id';
import {
  DbBeatmap,
  DbMappool,
  DbMappoolsBeatmaps,
  Schema,
  beatmaps,
  mappools,
  mappoolsBeatmaps,
  stages,
} from 'lib/infrastructure/db';
import { BeatmapService } from 'modules/beatmap/beatmap.service';
import { MappoolBeatmapView } from 'modules/beatmap/types';
import { MappoolCreateParams, MappoolUpdateParams } from './types';

@Injectable()
export class MappoolService {
  constructor(
    @Inject('DB') private readonly drizzle: Schema,
    private readonly beatmapService: BeatmapService,
  ) {}

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

  public async findBeatmaps(params: { id: MappoolId }): Promise<MappoolBeatmapView[]> {
    const { id } = params;

    await this.getById({ id });

    const rows = await this.drizzle
      .select({
        mappoolBeatmap: mappoolsBeatmaps,
        beatmap: beatmaps,
      })
      .from(mappoolsBeatmaps)
      .innerJoin(beatmaps, eq(beatmaps.id, mappoolsBeatmaps.beatmapId))
      .where(eq(mappoolsBeatmaps.mappoolId, id))
      .orderBy(asc(mappoolsBeatmaps.createdAt));

    return rows.map((row) =>
      this.beatmapService.toMappoolBeatmapView({
        mappoolBeatmap: row.mappoolBeatmap,
        beatmap: row.beatmap,
      }),
    );
  }

  public async update(params: {
    id: MappoolId;
    data: MappoolUpdateParams;
  }): Promise<DbMappool> {
    const {
      id,
      data: { startsAt, endsAt, hidden },
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
      .set({ startsAt, endsAt, hidden })
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
    mod: string;
    osuBeatmapsetId: number;
    osuBeatmapId: number;
  }): Promise<MappoolBeatmapView> {
    const { id, mod, osuBeatmapsetId, osuBeatmapId } = params;
    const normalizedMod = this.normalizeMod(mod);

    await this.getById({ id });

    const beatmap = await this.beatmapService.findOrCreate({
      osuBeatmapId,
      osuBeatmapsetId,
    });
    await this.assertBeatmapNotInMappool({ id, beatmapId: beatmap.id });

    const nextIndex = await this.getNextBeatmapIndex({
      id,
      mod: normalizedMod,
    });

    const [created] = await this.drizzle
      .insert(mappoolsBeatmaps)
      .values({
        mappoolId: id,
        beatmapId: beatmap.id,
        mod: normalizedMod,
        index: nextIndex,
      })
      .returning();

    return this.beatmapService.toMappoolBeatmapView({
      mappoolBeatmap: created,
      beatmap,
    });
  }

  public async updateBeatmap(params: {
    id: MappoolId;
    osuBeatmapId: number;
    mod?: string;
    index?: number;
    osuBeatmapsetId?: number;
    nextOsuBeatmapId?: number;
  }): Promise<MappoolBeatmapView> {
    const { id, osuBeatmapId, mod, index, osuBeatmapsetId, nextOsuBeatmapId } =
      params;

    await this.getById({ id });

    const current = await this.getBeatmapInMappoolByOsuBeatmapId({
      id,
      osuBeatmapId,
    });

    const replaceBeatmapRequested =
      nextOsuBeatmapId !== undefined || osuBeatmapsetId !== undefined;

    if (replaceBeatmapRequested) {
      const beatmap = await this.beatmapService.findOrCreate({
        osuBeatmapId: nextOsuBeatmapId!,
        osuBeatmapsetId: osuBeatmapsetId!,
      });

      await this.assertBeatmapNotInMappool({
        id,
        beatmapId: beatmap.id,
        exceptBeatmapId: current.mappoolBeatmap.beatmapId,
      });

      const [updated] = await this.drizzle
        .update(mappoolsBeatmaps)
        .set({ beatmapId: beatmap.id })
        .where(
          and(
            eq(mappoolsBeatmaps.mappoolId, id),
            eq(mappoolsBeatmaps.beatmapId, current.mappoolBeatmap.beatmapId),
          ),
        )
        .returning();

      if (!updated) {
        throw new MappoolException(
          'Beatmap in mappool not found',
          MappoolExceptionCode.MAPPOOL_BEATMAP_NOT_FOUND,
        );
      }

      return this.beatmapService.toMappoolBeatmapView({
        mappoolBeatmap: updated,
        beatmap,
      });
    }

    const nextMod =
      mod === undefined
        ? current.mappoolBeatmap.mod
        : this.normalizeMod(mod);
    const nextIndex =
      index ??
      (nextMod === current.mappoolBeatmap.mod
        ? current.mappoolBeatmap.index
        : await this.getNextBeatmapIndex({ id, mod: nextMod }));

    await this.assertIndexIsAvailable({
      id,
      mod: nextMod,
      index: nextIndex,
      beatmapId: current.mappoolBeatmap.beatmapId,
    });

    const [updated] = await this.drizzle
      .update(mappoolsBeatmaps)
      .set({ mod: nextMod, index: nextIndex })
      .where(
        and(
          eq(mappoolsBeatmaps.mappoolId, id),
          eq(mappoolsBeatmaps.beatmapId, current.mappoolBeatmap.beatmapId),
        ),
      )
      .returning();

    if (!updated) {
      throw new MappoolException(
        'Beatmap in mappool not found',
        MappoolExceptionCode.MAPPOOL_BEATMAP_NOT_FOUND,
      );
    }

    return this.beatmapService.toMappoolBeatmapView({
      mappoolBeatmap: updated,
      beatmap: current.beatmap,
    });
  }

  public async deleteBeatmap(params: {
    id: MappoolId;
    osuBeatmapId: number;
  }): Promise<MappoolBeatmapView> {
    const { id, osuBeatmapId } = params;

    await this.getById({ id });

    const current = await this.getBeatmapInMappoolByOsuBeatmapId({
      id,
      osuBeatmapId,
    });

    const [deleted] = await this.drizzle
      .delete(mappoolsBeatmaps)
      .where(
        and(
          eq(mappoolsBeatmaps.mappoolId, id),
          eq(mappoolsBeatmaps.beatmapId, current.mappoolBeatmap.beatmapId),
        ),
      )
      .returning();

    if (!deleted) {
      throw new MappoolException(
        'Beatmap in mappool not found',
        MappoolExceptionCode.MAPPOOL_BEATMAP_NOT_FOUND,
      );
    }

    return this.beatmapService.toMappoolBeatmapView({
      mappoolBeatmap: deleted,
      beatmap: current.beatmap,
    });
  }

  private async assertStageExists(params: { stageId: StageId }): Promise<void> {
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

  private async assertBeatmapNotInMappool(params: {
    id: MappoolId;
    beatmapId: BeatmapId;
    exceptBeatmapId?: BeatmapId;
  }) {
    const { id, beatmapId, exceptBeatmapId } = params;

    const mappoolBeatmap = await this.drizzle.query.mappoolsBeatmaps.findFirst({
      where: and(
        eq(mappoolsBeatmaps.mappoolId, id),
        eq(mappoolsBeatmaps.beatmapId, beatmapId),
        exceptBeatmapId
          ? ne(mappoolsBeatmaps.beatmapId, exceptBeatmapId)
          : undefined,
      ),
    });

    if (mappoolBeatmap) {
      throw new MappoolException(
        'Beatmap is already in mappool',
        MappoolExceptionCode.MAPPOOL_BEATMAP_ALREADY_EXISTS,
      );
    }
  }

  private async getNextBeatmapIndex(params: {
    id: MappoolId;
    mod: string;
  }): Promise<number> {
    const { id, mod } = params;

    const [row] = await this.drizzle
      .select({
        maxIndex: max(mappoolsBeatmaps.index),
      })
      .from(mappoolsBeatmaps)
      .where(
        and(eq(mappoolsBeatmaps.mappoolId, id), eq(mappoolsBeatmaps.mod, mod)),
      );

    return (row?.maxIndex ?? 0) + 1;
  }

  private async getBeatmapInMappoolByOsuBeatmapId(params: {
    id: MappoolId;
    osuBeatmapId: number;
  }): Promise<{
    mappoolBeatmap: DbMappoolsBeatmaps;
    beatmap: DbBeatmap;
  }> {
    const { id, osuBeatmapId } = params;

    const row = await this.drizzle
      .select({
        mappoolBeatmap: mappoolsBeatmaps,
        beatmap: beatmaps,
      })
      .from(mappoolsBeatmaps)
      .innerJoin(beatmaps, eq(beatmaps.id, mappoolsBeatmaps.beatmapId))
      .where(
        and(
          eq(mappoolsBeatmaps.mappoolId, id),
          eq(beatmaps.osuBeatmapId, osuBeatmapId),
        ),
      )
      .limit(1);

    const [found] = row;

    if (!found) {
      throw new MappoolException(
        'Beatmap in mappool not found',
        MappoolExceptionCode.MAPPOOL_BEATMAP_NOT_FOUND,
      );
    }

    const syncedBeatmap = await this.beatmapService.syncFromOsu({
      beatmap: found.beatmap,
    });

    return {
      mappoolBeatmap: found.mappoolBeatmap,
      beatmap: syncedBeatmap,
    };
  }

  private async assertIndexIsAvailable(params: {
    id: MappoolId;
    mod: string;
    index: number;
    beatmapId: BeatmapId;
  }): Promise<void> {
    const { id, mod, index, beatmapId } = params;

    const conflict = await this.drizzle.query.mappoolsBeatmaps.findFirst({
      where: and(
        eq(mappoolsBeatmaps.mappoolId, id),
        eq(mappoolsBeatmaps.mod, mod),
        eq(mappoolsBeatmaps.index, index),
        ne(mappoolsBeatmaps.beatmapId, beatmapId),
      ),
    });

    if (conflict) {
      throw new MappoolException(
        'Beatmap index is already used for this mod',
        MappoolExceptionCode.MAPPOOL_BEATMAP_INDEX_CONFLICT,
      );
    }
  }

  private normalizeMod(mod: string): string {
    return mod.trim().toUpperCase();
  }
}
