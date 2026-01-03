import { timestamp } from 'drizzle-orm/pg-core';

export const createdAt = timestamp('created_at', { withTimezone: false })
  .notNull()
  .defaultNow();

export const updatedAt = timestamp('updated_at', { withTimezone: false })
  .notNull()
  .defaultNow();
