import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  bigint,
  doublePrecision,
  foreignKey,
  integer,
  pgTable,
  primaryKey,
  text,
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { OsuRoomId } from 'lib/domain/osu-multiplayer/osu-room.id';
import { osuMultiplayerGames } from './games';

export const osuMultiplayerScores = pgTable(
  'osu_multiplayer_scores',
  {
    roomId: text('room_id').notNull().$type<OsuRoomId>(),
    osuGameId: bigint('osu_game_id', { mode: 'number' }).notNull(),
    osuUserId: bigint('osu_user_id', { mode: 'number' }).notNull(),
    osuBeatmapId: bigint('osu_beatmap_id', { mode: 'number' }).notNull(),
    score: bigint('score', { mode: 'number' }).notNull(),
    team: text('team').$type<'red' | 'blue'>(),
    mods: text('mods').array(),
    maxCombo: integer('max_combo'),
    accuracy: doublePrecision('accuracy'),
    rank: text('rank'),
    great: integer('great'),
    ok: integer('ok'),
    miss: integer('miss'),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({
      columns: [table.roomId, table.osuGameId, table.osuUserId],
    }),
    foreignKey({
      columns: [table.roomId, table.osuGameId],
      foreignColumns: [
        osuMultiplayerGames.roomId,
        osuMultiplayerGames.osuGameId,
      ],
    }).onDelete('cascade'),
  ],
);

export type DbOsuMultiplayerScore = InferSelectModel<
  typeof osuMultiplayerScores
>;
export type DbOsuMultiplayerScoreCreateParams = InferInsertModel<
  typeof osuMultiplayerScores
>;
