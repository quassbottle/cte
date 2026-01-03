import * as cuid2 from '@paralleldrive/cuid2';
import z from 'zod';

export const messageIdSchema = z.cuid2().brand('MessageId');

export type MessageId = z.infer<typeof messageIdSchema>;

const messageIdCuid = cuid2.init({ length: 24 });

export const messagesId = () => messageIdCuid() as MessageId;
