import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  bigint,
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { BeatmapId } from 'lib/domain/beatmap/beatmap.id';
import { TournamentMode } from 'lib/domain/tournament/tournament.mode';

export const beatmaps = pgTable(
  'beatmaps',
  {
    id: text('id').$type<BeatmapId>().primaryKey(),

    osuBeatmapsetId: bigint('osu_beatmapset_id', { mode: 'number' }).notNull(),
    osuBeatmapId: bigint('osu_beatmap_id', { mode: 'number' }).notNull(),
    artist: text('artist').notNull(),
    title: text('title').notNull(),
    mode: text('mode').$type<TournamentMode>().notNull().default('osu'),
    difficultyName: text('difficulty_name').notNull(),
    difficulty: doublePrecision('difficulty').notNull().default(0),
    version: integer('version').notNull().default(0),
    deleted: boolean('deleted').notNull().default(false),

    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('beatmaps_osu_beatmap_id_unique').on(table.osuBeatmapId),
  ],
);

export type DbBeatmap = InferSelectModel<typeof beatmaps>;
export type DbBeatmapCreateParams = InferInsertModel<typeof beatmaps>;
