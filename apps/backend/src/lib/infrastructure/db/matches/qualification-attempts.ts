import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { BeatmapId } from 'lib/domain/beatmap/beatmap.id';
import { MatchId } from 'lib/domain/match/match.id';
import { UserId } from 'lib/domain/user/user.id';
import { beatmaps } from '../beatmaps';
import { users } from '../users';
import { matches } from './index';

export const qualificationAttempts = pgTable(
  'qualification_attempts',
  {
    matchId: text('match_id')
      .notNull()
      .$type<MatchId>()
      .references(() => matches.id, { onDelete: 'cascade' }),
    osuGameId: bigint('osu_game_id', { mode: 'number' }).notNull(),
    beatmapId: text('beatmap_id')
      .notNull()
      .$type<BeatmapId>()
      .references(() => beatmaps.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .$type<UserId>()
      .references(() => users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    score: integer('score').notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.osuGameId, table.userId] }),
    index('qualification_attempts_map_user_idx').on(
      table.beatmapId,
      table.userId,
    ),
  ],
);

export type DbQualificationAttempt = InferSelectModel<
  typeof qualificationAttempts
>;
export type DbQualificationAttemptCreateParams = InferInsertModel<
  typeof qualificationAttempts
>;
