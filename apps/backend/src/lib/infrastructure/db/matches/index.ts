import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { MatchId } from 'lib/domain/match/match.id';
import { UserId } from 'lib/domain/user/user.id';
import { users } from '../users';

export const matches = pgTable('matches', {
  id: text('id').$type<MatchId>().primaryKey(),

  name: text('name').notNull(),

  creatorId: text('creator_id')
    .notNull()
    .$type<UserId>()
    .references(() => users.id, { onDelete: 'cascade' }),

  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),

  createdAt,
  updatedAt,
});

export type DbMatch = InferSelectModel<typeof matches>;
export type DbMatchCreateParams = InferInsertModel<typeof matches>;

export const participants = pgTable(
  'solo_participants',
  {
    matchId: text('match_id')
      .notNull()
      .$type<MatchId>()
      .references(() => matches.id, { onDelete: 'cascade' }),

    userId: text('user_id')
      .notNull()
      .$type<UserId>()
      .references(() => users.id, { onDelete: 'cascade' }),

    score: integer('score'),
    isWinner: boolean('is_winner'),

    createdAt,
    updatedAt,
  },
  (table) => [primaryKey({ columns: [table.matchId, table.userId] })],
);

export type DbParticipant = InferSelectModel<typeof participants>;
export type DbParticipantCreateParams = InferInsertModel<typeof participants>;
