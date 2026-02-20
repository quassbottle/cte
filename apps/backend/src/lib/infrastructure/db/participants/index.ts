import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { MatchId } from 'lib/domain/match/match.id';
import { UserId } from 'lib/domain/user/user.id';
import { matches } from '../matches';
import { users } from '../users';

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
