import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { beatmapId } from 'lib/domain/beatmap/beatmap.id';
import { OsuException, OsuExceptionCode } from 'lib/domain/osu/osu.exception';
import { Schema, beatmaps } from 'lib/infrastructure/db';
import { OsuService as OsuApiService } from 'lib/infrastructure/osu/osu.service';

@Injectable()
export class OsuBeatmapService {
  constructor(
    @Inject('DB') private readonly drizzle: Schema,
    private readonly osuApiService: OsuApiService,
  ) {}

  public async getBeatmapMetadata(params: { beatmapId: number }) {
    const { beatmapId: osuBeatmapId } = params;

    const existing = await this.drizzle.query.beatmaps.findFirst({
      where: eq(beatmaps.osuBeatmapId, osuBeatmapId),
    });

    try {
      const osuBeatmap = await this.osuApiService.getBeatmapDetails({
        osuBeatmapId,
      });

      if (!existing) {
        const [created] = await this.drizzle
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

        if (created) {
          return {
            osuBeatmapsetId: created.osuBeatmapsetId,
            osuBeatmapId: created.osuBeatmapId,
            artist: created.artist,
            title: created.title,
            difficultyName: created.difficultyName,
            difficulty: this.normalizeStarRate(created.difficulty),
            version: created.version,
            deleted: created.deleted,
          };
        }
      } else {
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
          .where(eq(beatmaps.id, existing.id))
          .returning();

        if (updated) {
          return {
            osuBeatmapsetId: updated.osuBeatmapsetId,
            osuBeatmapId: updated.osuBeatmapId,
            artist: updated.artist,
            title: updated.title,
            difficultyName: updated.difficultyName,
            difficulty: this.normalizeStarRate(updated.difficulty),
            version: updated.version,
            deleted: updated.deleted,
          };
        }
      }
    } catch (error) {
      if (!this.isBeatmapNotFoundError(error)) {
        throw error;
      }

      if (existing) {
        const [updated] = await this.drizzle
          .update(beatmaps)
          .set({ deleted: true })
          .where(eq(beatmaps.id, existing.id))
          .returning();

        if (updated) {
          return {
            osuBeatmapsetId: updated.osuBeatmapsetId,
            osuBeatmapId: updated.osuBeatmapId,
            artist: updated.artist,
            title: updated.title,
            difficultyName: updated.difficultyName,
            difficulty: this.normalizeStarRate(updated.difficulty),
            version: updated.version,
            deleted: updated.deleted,
          };
        }
      }

      throw new OsuException(
        `Beatmap ${osuBeatmapId} was not found`,
        OsuExceptionCode.BEATMAP_NOT_FOUND,
      );
    }

    throw new OsuException(
      `Failed to persist beatmap ${osuBeatmapId}`,
      OsuExceptionCode.BEATMAP_PERSISTENCE_FAILED,
    );
  }

  private normalizeStarRate(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private isBeatmapNotFoundError(error: unknown): boolean {
    return error instanceof Error && /\b404\b|not found/i.test(error.message);
  }
}
