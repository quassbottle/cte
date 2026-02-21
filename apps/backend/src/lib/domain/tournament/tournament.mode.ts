import z from 'zod';

export const tournamentModeSchema = z.enum(['osu', 'taiko', 'fruits', 'mania']);

export type TournamentMode = z.infer<typeof tournamentModeSchema>;
