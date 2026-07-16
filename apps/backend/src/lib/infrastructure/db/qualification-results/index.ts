import { InferInsertModel, InferSelectModel, sql } from 'drizzle-orm';
import {
  bigint,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { StageId } from 'lib/domain/stage/stage.id';
import { TeamId } from 'lib/domain/team/team.id';
import { UserId } from 'lib/domain/user/user.id';
import { stages } from '../stages';
import { teams } from '../teams';
import { users } from '../users';

export const qualificationResults = pgTable(
  'qualification_results',
  {
    stageId: text('stage_id')
      .notNull()
      .$type<StageId>()
      .references(() => stages.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .$type<UserId>()
      .references(() => users.id, { onDelete: 'cascade' }),
    teamId: text('team_id')
      .$type<TeamId>()
      .references(() => teams.id, { onDelete: 'cascade' }),
    seed: integer('seed').notNull(),
    aggregateScore: bigint('aggregate_score', { mode: 'number' }).notNull(),
    calculatedAt: timestamp('calculated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('qualification_results_stage_user_unique')
      .on(table.stageId, table.userId)
      .where(sql`${table.userId} IS NOT NULL`),
    uniqueIndex('qualification_results_stage_team_unique')
      .on(table.stageId, table.teamId)
      .where(sql`${table.teamId} IS NOT NULL`),
    check(
      'qualification_results_competitor_check',
      sql`(${table.userId} IS NOT NULL) <> (${table.teamId} IS NOT NULL)`,
    ),
  ],
);

export type DbQualificationResult = InferSelectModel<
  typeof qualificationResults
>;
export type DbQualificationResultCreateParams = InferInsertModel<
  typeof qualificationResults
>;
