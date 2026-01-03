import * as cuid2 from '@paralleldrive/cuid2';
import z from 'zod';

export const userIdSchema = z.cuid2().brand('UserId');

export type UserId = z.infer<typeof userIdSchema>;

const userIdCuid = cuid2.init({ length: 24 });

export const userId = () => userIdCuid() as UserId;
