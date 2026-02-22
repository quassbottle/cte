import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { beatmapId } from 'lib/domain/beatmap/beatmap.id';
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
    } catch {
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
    }

    return {
      osuBeatmapsetId: existing?.osuBeatmapsetId ?? 1,
      osuBeatmapId: existing?.osuBeatmapId ?? osuBeatmapId,
      artist: existing?.artist ?? 'Unknown artist',
      title: existing?.title ?? 'Unknown title',
      difficultyName: existing?.difficultyName ?? 'Unknown difficulty',
      difficulty: this.normalizeStarRate(existing?.difficulty ?? 0),
      version: existing?.version ?? 0,
      deleted: existing?.deleted ?? true,
    };
  }

  private normalizeStarRate(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
