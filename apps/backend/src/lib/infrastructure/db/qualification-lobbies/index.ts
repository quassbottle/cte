import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { OsuRoomId } from 'lib/domain/osu-multiplayer/osu-room.id';
import { QualificationLobbyId } from 'lib/domain/qualification-lobby/qualification-lobby.id';
import { StageId } from 'lib/domain/stage/stage.id';
import { UserId } from 'lib/domain/user/user.id';
import { osuMultiplayerRooms } from '../osu-multiplayer/rooms';
import { stages } from '../stages';
import { users } from '../users';

export const qualificationLobbies = pgTable(
  'qualification_lobbies',
  {
    id: text('id').$type<QualificationLobbyId>().primaryKey(),
    stageId: text('stage_id')
      .notNull()
      .$type<StageId>()
      .references(() => stages.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    refereeId: text('referee_id')
      .notNull()
      .$type<UserId>()
      .references(() => users.id),
    startsAt: timestamp('starts_at').notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    mpUrl: text('mp_url'),
    osuRoomId: text('osu_room_id')
      .$type<OsuRoomId>()
      .unique()
      .references(() => osuMultiplayerRooms.id),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('qualification_lobbies_stage_number_unique').on(
      table.stageId,
      table.number,
    ),
    uniqueIndex('qualification_lobbies_id_stage_unique').on(
      table.id,
      table.stageId,
    ),
  ],
);
export type DbQualificationLobby = InferSelectModel<
  typeof qualificationLobbies
>;
export type DbQualificationLobbyCreateParams = InferInsertModel<
  typeof qualificationLobbies
>;
