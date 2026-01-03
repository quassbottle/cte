import { matchesId, MatchId } from 'core/domain/match/match.id';
import { MpChannel } from 'core/irc/types';
import { createdAt, updatedAt } from 'core/utils/drizzle/date';
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const matches = pgTable('matches', {
  id: text('id').$type<MatchId>().primaryKey().notNull().$defaultFn(matchesId),

  matchId: integer('match_id').notNull().unique(),
  channel: text('channel').$type<MpChannel>().notNull().unique(),

  name: text('name').notNull(),
  creationTime: timestamp('creation_time', { withTimezone: false }).notNull(),

  closed: boolean().notNull().default(false),

  createdAt,
  updatedAt,
});
