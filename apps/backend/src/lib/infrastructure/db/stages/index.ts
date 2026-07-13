import { InferInsertModel, InferSelectModel, sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { StageId } from 'lib/domain/stage/stage.id';
import { StageType } from 'lib/domain/stage/stage.type';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { tournaments } from '../tournaments';

export const stages = pgTable(
  'stages',
  {
    id: text('id').$type<StageId>().primaryKey(),

    name: text('name').notNull(),
    type: text('type').$type<StageType>().notNull().default('regular'),

    tournamentId: text('tournament_id')
      .notNull()
      .$type<TournamentId>()
      .references(() => tournaments.id, { onDelete: 'cascade' }),

    startsAt: timestamp('starts_at').notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('stages_one_qualification_per_tournament')
      .on(table.tournamentId)
      .where(
        sql`${table.deletedAt} IS NULL AND ${table.type} = 'qualification'`,
      ),
  ],
);

export type DbStage = InferSelectModel<typeof stages>;
export type DbStageCreateParams = InferInsertModel<typeof stages>;
