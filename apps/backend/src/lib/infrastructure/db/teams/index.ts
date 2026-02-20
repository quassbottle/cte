import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { TeamId } from 'lib/domain/team/team.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { tournaments } from '../tournaments';

export const teams = pgTable('teams', {
  id: text('id').$type<TeamId>().primaryKey(),

  name: text('name').notNull(),

  tournamentId: text('tournament_id')
    .notNull()
    .$type<TournamentId>()
    .references(() => tournaments.id, { onDelete: 'cascade' }),

  createdAt,
  updatedAt,
});

export type DbTeam = InferSelectModel<typeof teams>;
export type DbTeamCreateParams = InferInsertModel<typeof teams>;
