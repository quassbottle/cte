import * as cuid2 from '@paralleldrive/cuid2';
import z from 'zod';

export const tournamentIdSchema = z.cuid2().brand('TournamentId');

export type TournamentId = z.infer<typeof tournamentIdSchema>;

const tournamentIdCuid = cuid2.init({ length: 24 });

export const tournamentId = () => tournamentIdCuid() as TournamentId;
