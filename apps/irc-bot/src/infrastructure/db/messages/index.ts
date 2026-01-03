import { MessageId, messagesId } from 'core/domain/message/message.id';
import { createdAt, updatedAt } from 'core/utils/drizzle/date';
import { pgTable, text } from 'drizzle-orm/pg-core';

export const messages = pgTable('messages', {
  id: text('id')
    .$type<MessageId>()
    .primaryKey()
    .notNull()
    .$defaultFn(messagesId),

  channel: text('channel').notNull(),

  sender: text('user').notNull(),
  text: text('text').notNull(),

  createdAt,
  updatedAt,
});
