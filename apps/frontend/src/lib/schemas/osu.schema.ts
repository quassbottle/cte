import { z } from 'zod';

export const osuBeatmapMetadataSchema = z.object({
	osuBeatmapsetId: z.number().int().positive(),
	osuBeatmapId: z.number().int().positive(),
	artist: z.string(),
	title: z.string(),
	difficultyName: z.string(),
	difficulty: z.number(),
	version: z.number(),
	deleted: z.boolean()
});

export type OsuBeatmapMetadata = z.infer<typeof osuBeatmapMetadataSchema>;
