import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { integer, pgTable, primaryKey, real, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { TournamentMode } from 'lib/domain/tournament/tournament.mode';
import { UserId } from 'lib/domain/user/user.id';
import { users } from '../users';

export const osuStats = pgTable(
  'osu_stats',
  {
    userId: text('user_id')
      .notNull()
      .$type<UserId>()
      .references(() => users.id, { onDelete: 'cascade' }),
    osuId: integer('osu_id').notNull(),
    performancePoints: real('performance_points'),
    rank: integer('rank'),
    mode: text('mode').$type<TournamentMode>().notNull(),

    createdAt,
    updatedAt,
  },
  (table) => [primaryKey({ columns: [table.userId, table.mode] })],
);

export type DbOsuStats = InferSelectModel<typeof osuStats>;
export type DbOsuStatsCreateParams = InferInsertModel<typeof osuStats>;
