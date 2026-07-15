import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  foreignKey,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { QualificationLobbyId } from 'lib/domain/qualification-lobby/qualification-lobby.id';
import { StageId } from 'lib/domain/stage/stage.id';
import { TeamId } from 'lib/domain/team/team.id';
import { UserId } from 'lib/domain/user/user.id';
import { stages } from '../stages';
import { teams } from '../teams';
import { users } from '../users';
import { qualificationLobbies } from './index';

export const qualificationLobbyPlayers = pgTable(
  'qualification_lobby_players',
  {
    lobbyId: text('lobby_id').notNull().$type<QualificationLobbyId>(),
    stageId: text('stage_id')
      .notNull()
      .$type<StageId>()
      .references(() => stages.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .$type<UserId>()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.lobbyId, table.userId] }),
    uniqueIndex('qualification_lobby_players_stage_user_unique').on(
      table.stageId,
      table.userId,
    ),
    foreignKey({
      columns: [table.lobbyId, table.stageId],
      foreignColumns: [qualificationLobbies.id, qualificationLobbies.stageId],
    }).onDelete('cascade'),
  ],
);

export const qualificationLobbyTeams = pgTable(
  'qualification_lobby_teams',
  {
    lobbyId: text('lobby_id').notNull().$type<QualificationLobbyId>(),
    stageId: text('stage_id')
      .notNull()
      .$type<StageId>()
      .references(() => stages.id, { onDelete: 'cascade' }),
    teamId: text('team_id')
      .notNull()
      .$type<TeamId>()
      .references(() => teams.id, { onDelete: 'cascade' }),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.lobbyId, table.teamId] }),
    uniqueIndex('qualification_lobby_teams_stage_team_unique').on(
      table.stageId,
      table.teamId,
    ),
    foreignKey({
      columns: [table.lobbyId, table.stageId],
      foreignColumns: [qualificationLobbies.id, qualificationLobbies.stageId],
    }).onDelete('cascade'),
  ],
);

export type DbQualificationLobbyPlayer = InferSelectModel<
  typeof qualificationLobbyPlayers
>;
export type DbQualificationLobbyPlayerCreateParams = InferInsertModel<
  typeof qualificationLobbyPlayers
>;
export type DbQualificationLobbyTeam = InferSelectModel<
  typeof qualificationLobbyTeams
>;
export type DbQualificationLobbyTeamCreateParams = InferInsertModel<
  typeof qualificationLobbyTeams
>;
