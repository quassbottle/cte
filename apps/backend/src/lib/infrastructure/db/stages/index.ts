import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { StageId } from 'lib/domain/stage/stage.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { tournaments } from '../tournaments';

export const stages = pgTable('stages', {
  id: text('id').$type<StageId>().primaryKey(),

  name: text('name').notNull(),

  tournamentId: text('tournament_id')
    .notNull()
    .$type<TournamentId>()
    .references(() => tournaments.id, { onDelete: 'cascade' }),

  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),

  createdAt,
  updatedAt,
});

export type DbStage = InferSelectModel<typeof stages>;
export type DbStageCreateParams = InferInsertModel<typeof stages>;
