import { z } from 'zod';

const emptyToNull = (value: string) => (value.trim() === '' ? null : value.trim());

const checkbox = z.preprocess((value) => value === 'on' || value === 'true', z.boolean());

const positiveInt = z.coerce.number().int().positive();

const dateRange = z
	.object({
		startsAt: z.coerce.date(),
		endsAt: z.coerce.date()
	})
	.refine((value) => value.endsAt > value.startsAt, {
		message: 'End date must be later than start date',
		path: ['endsAt']
	})
	.transform((value) => ({
		startsAt: value.startsAt.toISOString(),
		endsAt: value.endsAt.toISOString()
	}));

export const tournamentEditFormSchema = z
	.object({
		name: z.string().trim().min(1, 'Name is required'),
		description: z.string().transform(emptyToNull),
		rules: z.string().transform(emptyToNull),
		mode: z.enum(['osu', 'taiko', 'fruits', 'mania']),
		isTeam: checkbox.default(false),
		registrationOpen: checkbox.default(false)
	})
	.and(dateRange);

export const stageCreateFormSchema = z
	.object({
		name: z.string().trim().min(1, 'Stage name is required')
	})
	.and(dateRange);

export const stageUpdateFormSchema = stageCreateFormSchema.and(
	z.object({
		stageId: z.string().trim().min(1, 'Stage id is required')
	})
);

export const stageDeleteFormSchema = z.object({
	stageId: z.string().trim().min(1, 'Stage id is required')
});

export const mappoolCreateFormSchema = z
	.object({
		stageId: z.string().trim().min(1, 'Stage id is required')
	})
	.and(dateRange);

export const mappoolVisibilityFormSchema = z.object({
	mappoolId: z.string().trim().min(1, 'Mappool id is required'),
	hidden: z.enum(['true', 'false']).transform((value) => value === 'true')
});

export const mappoolBeatmapAddFormSchema = z.object({
	mappoolId: z.string().trim().min(1, 'Mappool id is required'),
	mod: z.string().trim().toUpperCase().min(1, 'Mod is required'),
	beatmapId: positiveInt,
	beatmapsetId: positiveInt.optional()
});

export const mappoolBeatmapUpdateFormSchema = z.object({
	mappoolId: z.string().trim().min(1, 'Mappool id is required'),
	osuBeatmapId: positiveInt,
	mod: z.string().trim().toUpperCase().min(1, 'Mod is required'),
	index: positiveInt
});

export const mappoolBeatmapReplaceFormSchema = z.object({
	mappoolId: z.string().trim().min(1, 'Mappool id is required'),
	osuBeatmapId: positiveInt,
	beatmapId: positiveInt,
	beatmapsetId: positiveInt.optional()
});

export const mappoolBeatmapDeleteFormSchema = z.object({
	mappoolId: z.string().trim().min(1, 'Mappool id is required'),
	osuBeatmapId: positiveInt
});

export type TournamentEditForm = z.infer<typeof tournamentEditFormSchema>;
export type StageCreateForm = z.infer<typeof stageCreateFormSchema>;
export type StageUpdateForm = z.infer<typeof stageUpdateFormSchema>;
export type StageDeleteForm = z.infer<typeof stageDeleteFormSchema>;
export type MappoolCreateForm = z.infer<typeof mappoolCreateFormSchema>;
export type MappoolVisibilityForm = z.infer<typeof mappoolVisibilityFormSchema>;
export type MappoolBeatmapAddForm = z.infer<typeof mappoolBeatmapAddFormSchema>;
export type MappoolBeatmapUpdateForm = z.infer<typeof mappoolBeatmapUpdateFormSchema>;
export type MappoolBeatmapReplaceForm = z.infer<typeof mappoolBeatmapReplaceFormSchema>;
export type MappoolBeatmapDeleteForm = z.infer<typeof mappoolBeatmapDeleteFormSchema>;
