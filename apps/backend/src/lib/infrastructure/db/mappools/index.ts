import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { MappoolId } from 'lib/domain/mappool/mappool.id';
import { StageId } from 'lib/domain/stage/stage.id';
import { stages } from '../stages';

export const mappools = pgTable('mappools', {
  id: text('id').$type<MappoolId>().primaryKey(),

  stageId: text('stage_id')
    .notNull()
    .$type<StageId>()
    .references(() => stages.id, { onDelete: 'cascade' }),

  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),

  createdAt,
  updatedAt,
});

export type DbMappool = InferSelectModel<typeof mappools>;
export type DbMappoolCreateParams = InferInsertModel<typeof mappools>;
