import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from 'lib/common/utils/drizzle/date';
import { StaffRoleId } from 'lib/domain/staff-role/staff-role.id';

export const staffRoles = pgTable('staff_roles', {
  id: text('id').$type<StaffRoleId>().primaryKey(),
  name: text('name').notNull().unique(),
  createdAt,
  updatedAt,
});

export type DbStaffRole = InferSelectModel<typeof staffRoles>;
export type DbStaffRoleCreateParams = InferInsertModel<typeof staffRoles>;
