import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { MatchId } from 'lib/domain/match/match.id';
import { UserId } from 'lib/domain/user/user.id';
import { users } from '../users';
import { matches } from './index';

export type MatchStaffRole = 'commentator' | 'referee' | 'streamer';

export const matchStaff = pgTable(
  'match_staff',
  {
    matchId: text('match_id')
      .notNull()
      .$type<MatchId>()
      .references(() => matches.id, { onDelete: 'cascade' }),

    userId: text('user_id')
      .notNull()
      .$type<UserId>()
      .references(() => users.id, { onDelete: 'cascade' }),

    role: text('role').$type<MatchStaffRole>().notNull(),

    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.userId, table.role] }),
  ],
);

export type DbMatchStaff = InferSelectModel<typeof matchStaff>;
export type DbMatchStaffCreateParams = InferInsertModel<typeof matchStaff>;
