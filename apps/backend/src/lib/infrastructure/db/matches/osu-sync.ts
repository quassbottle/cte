import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { MatchId } from 'lib/domain/match/match.id';
import { matches } from './index';

export const matchSyncStatuses = ['active', 'stopped', 'completed'] as const;
export type MatchSyncStatus = (typeof matchSyncStatuses)[number];

export const matchOsuSync = pgTable(
  'match_osu_sync',
  {
    matchId: text('match_id')
      .$type<MatchId>()
      .primaryKey()
      .references(() => matches.id, { onDelete: 'cascade' }),
    osuMatchId: bigint('osu_match_id', { mode: 'number' }).notNull(),
    status: text('status').$type<MatchSyncStatus>().notNull().default('active'),
    nextSyncAt: timestamp('next_sync_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    leaseToken: text('lease_token'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    lastError: text('last_error'),
    attempts: integer('attempts').notNull().default(0),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('match_osu_sync_osu_match_id_unique').on(table.osuMatchId),
    index('match_osu_sync_due_idx').on(table.status, table.nextSyncAt),
  ],
);

export type DbMatchOsuSync = InferSelectModel<typeof matchOsuSync>;
export type DbMatchOsuSyncCreateParams = InferInsertModel<typeof matchOsuSync>;
