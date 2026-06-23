import { z } from 'zod';

export const tournamentCreateFormSchema = z.object({
	name: z.string().trim().min(1, 'Name is required'),
	mode: z.enum(['osu', 'taiko', 'fruits', 'mania'])
});

export type TournamentCreateForm = z.infer<typeof tournamentCreateFormSchema>;
