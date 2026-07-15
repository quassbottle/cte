import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  bigint,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { OsuRoomId } from 'lib/domain/osu-multiplayer/osu-room.id';
import { osuMultiplayerRooms } from './rooms';

export const osuMultiplayerGames = pgTable(
  'osu_multiplayer_games',
  {
    roomId: text('room_id')
      .notNull()
      .$type<OsuRoomId>()
      .references(() => osuMultiplayerRooms.id, { onDelete: 'cascade' }),
    osuGameId: bigint('osu_game_id', { mode: 'number' }).notNull(),
    osuBeatmapId: bigint('osu_beatmap_id', { mode: 'number' }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [primaryKey({ columns: [table.roomId, table.osuGameId] })],
);

export type DbOsuMultiplayerGame = InferSelectModel<typeof osuMultiplayerGames>;
export type DbOsuMultiplayerGameCreateParams = InferInsertModel<
  typeof osuMultiplayerGames
>;
