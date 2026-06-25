import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { MatchId } from 'lib/domain/match/match.id';
import { StageId } from 'lib/domain/stage/stage.id';
import { UserId } from 'lib/domain/user/user.id';
import { stages } from '../stages';
import { users } from '../users';

export const matches = pgTable('matches', {
  id: text('id').$type<MatchId>().primaryKey(),

  name: text('name').notNull(),
  stageId: text('stage_id')
    .$type<StageId>()
    .references(() => stages.id, { onDelete: 'cascade' }),
  matchNumber: integer('match_number'),

  creatorId: text('creator_id')
    .notNull()
    .$type<UserId>()
    .references(() => users.id, { onDelete: 'cascade' }),

  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  mpUrl: text('mp_url'),
  vodUrl: text('vod_url'),

  createdAt,
  updatedAt,
});

export type DbMatch = InferSelectModel<typeof matches>;
export type DbMatchCreateParams = InferInsertModel<typeof matches>;
