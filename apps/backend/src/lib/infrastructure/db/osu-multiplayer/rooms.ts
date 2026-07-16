import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { bigint, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { OsuRoomId } from 'lib/domain/osu-multiplayer/osu-room.id';

export const osuMultiplayerRooms = pgTable('osu_multiplayer_rooms', {
  id: text('id').$type<OsuRoomId>().primaryKey(),
  osuMatchId: bigint('osu_match_id', { mode: 'number' }).notNull().unique(),
  status: text('status')
    .$type<'active' | 'stopped' | 'completed'>()
    .notNull()
    .default('active'),
  snapshotHash: text('snapshot_hash'),
  nextSyncAt: timestamp('next_sync_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  leaseUntil: timestamp('lease_until', { withTimezone: true }),
  leaseToken: text('lease_token'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  lastDataChangedAt: timestamp('last_data_changed_at', { withTimezone: true }),
  lastError: text('last_error'),
  attempts: integer('attempts').notNull().default(0),
  createdAt,
  updatedAt,
});

export type DbOsuMultiplayerRoom = InferSelectModel<typeof osuMultiplayerRooms>;
export type DbOsuMultiplayerRoomCreateParams = InferInsertModel<
  typeof osuMultiplayerRooms
>;
