import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { UserId } from 'lib/domain/user/user.id';

export const users = pgTable('users', {
  id: text('id').$type<UserId>().primaryKey(),

  osuId: integer('osu_id').notNull().unique(),
  osuUsername: text('osu_username').notNull(),

  createdAt,
  updatedAt,
});

export type DbUser = InferSelectModel<typeof users>;
export type DbUserCreateParams = InferInsertModel<typeof users>;
