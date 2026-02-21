import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { BeatmapId } from 'lib/domain/beatmap/beatmap.id';
import { MappoolId } from 'lib/domain/mappool/mappool.id';
import { beatmaps } from '../beatmaps';
import { mappools } from './index';

export const mappoolsBeatmaps = pgTable(
  'mappools_beatmaps',
  {
    mappoolId: text('mappool_id')
      .notNull()
      .$type<MappoolId>()
      .references(() => mappools.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),

    beatmapId: text('beatmap_id')
      .notNull()
      .$type<BeatmapId>()
      .references(() => beatmaps.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),

    createdAt,
    updatedAt,
  },
  (table) => [primaryKey({ columns: [table.mappoolId, table.beatmapId] })],
);

export type DbMappoolsBeatmaps = InferSelectModel<typeof mappoolsBeatmaps>;
export type DbMappoolsBeatmapsCreateParams = InferInsertModel<
  typeof mappoolsBeatmaps
>;
