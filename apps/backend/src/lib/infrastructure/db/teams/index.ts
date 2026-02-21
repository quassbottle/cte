import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { TeamId } from 'lib/domain/team/team.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { UserId } from 'lib/domain/user/user.id';
import { tournaments } from '../tournaments';
import { users } from '../users';

export const teams = pgTable('teams', {
  id: text('id').$type<TeamId>().primaryKey(),

  name: text('name').notNull(),

  captainId: text('captain_id')
    .notNull()
    .$type<UserId>()
    .references(() => users.id, { onDelete: 'cascade' }),

  tournamentId: text('tournament_id')
    .notNull()
    .$type<TournamentId>()
    .references(() => tournaments.id, { onDelete: 'cascade' }),

  createdAt,
  updatedAt,
});

export type DbTeam = InferSelectModel<typeof teams>;
export type DbTeamCreateParams = InferInsertModel<typeof teams>;
