import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { boolean, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { UserId } from 'lib/domain/user/user.id';
import { tournaments } from '../tournaments';
import { users } from '../users';

export const soloParticipants = pgTable(
  'solo_participants',
  {
    tournamentId: text('tournament_id')
      .notNull()
      .$type<TournamentId>()
      .references(() => tournaments.id, { onDelete: 'cascade' }),

    userId: text('user_id')
      .notNull()
      .$type<UserId>()
      .references(() => users.id, { onDelete: 'cascade' }),

    withdrawn: boolean('withdrawn').notNull().default(false),
    withdrawalReason: text('withdrawal_reason'),

    createdAt,
    updatedAt,
  },
  (table) => [primaryKey({ columns: [table.tournamentId, table.userId] })],
);

export type DbSoloParticipant = InferSelectModel<typeof soloParticipants>;
export type DbSoloParticipantCreateParams = InferInsertModel<
  typeof soloParticipants
>;
