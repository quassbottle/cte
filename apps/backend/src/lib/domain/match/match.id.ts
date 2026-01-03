import * as cuid2 from '@paralleldrive/cuid2';
import z from 'zod';

export const matchIdSchema = z.cuid2().brand('MatchId');

export type MatchId = z.infer<typeof matchIdSchema>;

const matchIdCuid = cuid2.init({ length: 24 });

export const matchId = () => matchIdCuid() as MatchId;
