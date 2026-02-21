import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { beatmapId } from 'lib/domain/beatmap/beatmap.id';
import {
  MappoolException,
  MappoolExceptionCode,
} from 'lib/domain/mappool/mappool.exception';
import { DbBeatmap, Schema, beatmaps } from 'lib/infrastructure/db';
import { OsuService } from 'lib/infrastructure/osu/osu.service';
import {
  BuildMappoolBeatmapViewParams,
  FindOrCreateBeatmapParams,
  MappoolBeatmapView,
  SyncBeatmapParams,
  mappoolBeatmapViewSchema,
} from './types';

@Injectable()
export class BeatmapService {
  constructor(
    @Inject('DB') private readonly drizzle: Schema,
    private readonly osuService: OsuService,
  ) {}

  public async findOrCreate(
    params: FindOrCreateBeatmapParams,
  ): Promise<DbBeatmap> {
    const { osuBeatmapId, osuBeatmapsetId } = params;

    const existing = await this.drizzle.query.beatmaps.findFirst({
      where: eq(beatmaps.osuBeatmapId, osuBeatmapId),
    });

    if (existing) {
      this.assertBeatmapSetMatches({
        beatmap: existing,
        osuBeatmapsetId,
      });

      return this.syncFromOsu({ beatmap: existing });
    }

    let created: DbBeatmap | undefined;

    try {
      const osuBeatmap = await this.osuService.getBeatmapDetails({
        osuBeatmapId,
      });

      if (osuBeatmap.beatmapset_id !== osuBeatmapsetId) {
        throw new MappoolException(
          'Beatmapset does not match beatmap id',
          MappoolExceptionCode.MAPPOOL_BEATMAP_INVALID,
        );
      }

      const [createdFromOsu] = await this.drizzle
        .insert(beatmaps)
        .values({
          id: beatmapId(),
          osuBeatmapId: osuBeatmap.id,
          osuBeatmapsetId: osuBeatmap.beatmapset_id,
          artist: osuBeatmap.beatmapset.artist,
          title: osuBeatmap.beatmapset.title,
          mode: osuBeatmap.mode,
          difficultyName: osuBeatmap.version,
          difficulty: this.normalizeStarRate(osuBeatmap.difficulty_rating),
          version: osuBeatmap.ranked,
          deleted: false,
        })
        .onConflictDoNothing({
          target: beatmaps.osuBeatmapId,
        })
        .returning();

      created = createdFromOsu;
    } catch (error) {
      if (error instanceof MappoolException) {
        throw error;
      }

      const [createdDeleted] = await this.drizzle
        .insert(beatmaps)
        .values({
          id: beatmapId(),
          osuBeatmapId,
          osuBeatmapsetId,
          artist: 'Unknown artist',
          title: 'Unknown title',
          mode: 'osu',
          difficultyName: 'Unknown difficulty',
          difficulty: 0,
          version: 0,
          deleted: true,
        })
        .onConflictDoNothing({
          target: beatmaps.osuBeatmapId,
        })
        .returning();

      created = createdDeleted;
    }

    if (created) {
      return created;
    }

    const fallback = await this.drizzle.query.beatmaps.findFirst({
      where: eq(beatmaps.osuBeatmapId, osuBeatmapId),
    });

    if (!fallback) {
      throw new MappoolException(
        'Beatmap not found',
        MappoolExceptionCode.MAPPOOL_BEATMAP_NOT_FOUND,
      );
    }

    return fallback;
  }

  public async syncFromOsu(params: SyncBeatmapParams): Promise<DbBeatmap> {
    const { beatmap } = params;

    try {
      const osuBeatmap = await this.osuService.getBeatmapDetails({
        osuBeatmapId: beatmap.osuBeatmapId,
      });

      const [updated] = await this.drizzle
        .update(beatmaps)
        .set({
          osuBeatmapsetId: osuBeatmap.beatmapset_id,
          artist: osuBeatmap.beatmapset.artist,
          title: osuBeatmap.beatmapset.title,
          mode: osuBeatmap.mode,
          difficultyName: osuBeatmap.version,
          difficulty: this.normalizeStarRate(osuBeatmap.difficulty_rating),
          version: osuBeatmap.ranked,
          deleted: false,
        })
        .where(eq(beatmaps.id, beatmap.id))
        .returning();

      if (!updated) {
        return beatmap;
      }

      return updated;
    } catch {
      const [updated] = await this.drizzle
        .update(beatmaps)
        .set({ deleted: true })
        .where(eq(beatmaps.id, beatmap.id))
        .returning();

      if (!updated) {
        return beatmap;
      }

      return updated;
    }
  }

  public toMappoolBeatmapView(
    params: BuildMappoolBeatmapViewParams,
  ): MappoolBeatmapView {
    const { mappoolBeatmap, beatmap } = params;

    return mappoolBeatmapViewSchema.parse({
      beatmapId: beatmap.id,
      mod: mappoolBeatmap.mod,
      index: mappoolBeatmap.index,
      osuBeatmapsetId: beatmap.osuBeatmapsetId,
      osuBeatmapId: beatmap.osuBeatmapId,
      artist: beatmap.artist,
      title: beatmap.title,
      mode: beatmap.mode,
      difficultyName: beatmap.difficultyName,
      difficulty: this.normalizeStarRate(beatmap.difficulty),
      version: beatmap.version,
      deleted: beatmap.deleted,
      createdAt: mappoolBeatmap.createdAt,
      updatedAt: mappoolBeatmap.updatedAt,
    });
  }

  private assertBeatmapSetMatches(params: {
    beatmap: Pick<DbBeatmap, 'osuBeatmapsetId'>;
    osuBeatmapsetId: number;
  }): void {
    const { beatmap, osuBeatmapsetId } = params;

    if (beatmap.osuBeatmapsetId !== osuBeatmapsetId) {
      throw new MappoolException(
        'Beatmapset does not match beatmap id',
        MappoolExceptionCode.MAPPOOL_BEATMAP_INVALID,
      );
    }
  }

  private normalizeStarRate(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
