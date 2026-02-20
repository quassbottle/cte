import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { bigint, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { BeatmapId } from 'lib/domain/beatmap/beatmap.id';

export const beatmaps = pgTable('beatmaps', {
  id: text('id').$type<BeatmapId>().primaryKey(),

  osuBeatmapId: bigint('osu_beatmap_id', { mode: 'number' }).notNull(),

  createdAt,
  updatedAt,
});

export type DbBeatmap = InferSelectModel<typeof beatmaps>;
export type DbBeatmapCreateParams = InferInsertModel<typeof beatmaps>;
