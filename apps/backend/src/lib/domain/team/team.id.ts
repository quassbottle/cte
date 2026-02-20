import * as cuid2 from '@paralleldrive/cuid2';
import z from 'zod';

export const teamIdSchema = z.cuid2().brand('TeamId');

export type TeamId = z.infer<typeof teamIdSchema>;

const teamIdCuid = cuid2.init({ length: 24 });

export const teamId = () => teamIdCuid() as TeamId;
