import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { StaffRoleId } from 'lib/domain/staff-role/staff-role.id';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { UserId } from 'lib/domain/user/user.id';
import { staffRoles } from '../staff-roles';
import { users } from '../users';
import { tournaments } from './index';

export const tournamentStaffMembers = pgTable(
  'tournament_staff_members',
  {
    tournamentId: text('tournament_id')
      .notNull()
      .$type<TournamentId>()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .$type<StaffRoleId>()
      .references(() => staffRoles.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .$type<UserId>()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.tournamentId, table.roleId, table.userId] }),
  ],
);

export type DbTournamentStaffMember = InferSelectModel<
  typeof tournamentStaffMembers
>;
export type DbTournamentStaffMemberCreateParams = InferInsertModel<
  typeof tournamentStaffMembers
>;
