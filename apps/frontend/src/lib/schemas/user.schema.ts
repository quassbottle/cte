import { z } from 'zod';

export const selectedUserSchema = z.object({
	id: z.string(),
	osuId: z.number(),
	osuUsername: z.string(),
	avatarUrl: z.string()
});

export type SelectedUser = z.infer<typeof selectedUserSchema>;
