import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { TeamId } from 'lib/domain/team/team.id';
import { UserId } from 'lib/domain/user/user.id';
import { users } from '../users';
import { teams } from './index';

export const teamParticipants = pgTable(
  'team_participants',
  {
    teamId: text('team_id')
      .notNull()
      .$type<TeamId>()
      .references(() => teams.id, {
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

    createdAt,
    updatedAt,
  },
  (table) => [primaryKey({ columns: [table.teamId, table.userId] })],
);

export type DbTeamParticipant = InferSelectModel<typeof teamParticipants>;
export type DbTeamParticipantCreateParams = InferInsertModel<
  typeof teamParticipants
>;
