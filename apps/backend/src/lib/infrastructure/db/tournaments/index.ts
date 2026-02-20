import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { UserId } from 'lib/domain/user/user.id';
import { users } from '../users';

export const tournaments = pgTable('tournaments', {
  id: text('id').$type<TournamentId>().primaryKey(),

  name: text('name').notNull(),

  description: text('description'),
  rules: text('rules'),
  isTeam: boolean('is_team').notNull().default(false),

  creatorId: text('creator_id')
    .notNull()
    .$type<UserId>()
    .references(() => users.id, { onDelete: 'cascade' }),

  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  createdAt,
  updatedAt,
});

export type DbTournament = InferSelectModel<typeof tournaments>;
export type DbTournamentCreateParams = InferInsertModel<typeof tournaments>;
