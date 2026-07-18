import { InferInsertModel, InferSelectModel, sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { MatchId } from 'lib/domain/match/match.id';
import { OsuRoomId } from 'lib/domain/osu-multiplayer/osu-room.id';
import { StageId } from 'lib/domain/stage/stage.id';
import { TeamId } from 'lib/domain/team/team.id';
import { UserId } from 'lib/domain/user/user.id';
import { osuMultiplayerRooms } from '../osu-multiplayer/rooms';
import { stages } from '../stages';
import { teams } from '../teams';
import { users } from '../users';

export const matches = pgTable(
  'matches',
  {
    id: text('id').$type<MatchId>().primaryKey(),

    name: text('name').notNull(),
    stageId: text('stage_id')
      .$type<StageId>()
      .references(() => stages.id, { onDelete: 'cascade' }),
    matchNumber: text('match_number'),

    creatorId: text('creator_id')
      .notNull()
      .$type<UserId>()
      .references(() => users.id, { onDelete: 'cascade' }),

    startsAt: timestamp('starts_at').notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    osuRoomId: text('osu_room_id')
      .$type<OsuRoomId>()
      .unique()
      .references(() => osuMultiplayerRooms.id),
    vodUrl: text('vod_url'),
    redTeamId: text('red_team_id')
      .$type<TeamId>()
      .references(() => teams.id),
    blueTeamId: text('blue_team_id')
      .$type<TeamId>()
      .references(() => teams.id),
    createdAt,
    updatedAt,
  },
  (table) => [
    check(
      'matches_distinct_teams_check',
      sql`${table.redTeamId} IS NULL OR ${table.blueTeamId} IS NULL OR ${table.redTeamId} <> ${table.blueTeamId}`,
    ),
  ],
);

export type DbMatch = InferSelectModel<typeof matches>;
export type DbMatchCreateParams = InferInsertModel<typeof matches>;
