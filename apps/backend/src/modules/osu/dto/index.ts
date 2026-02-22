import { createZodDto } from 'nestjs-zod/dto';
import z from 'zod';

export const osuBeatmapMetadataDtoSchema = z.object({
  osuBeatmapsetId: z.number().int().positive(),
  osuBeatmapId: z.number().int().positive(),
  artist: z.string(),
  title: z.string(),
  difficultyName: z.string(),
  difficulty: z.number(),
  version: z.number().int(),
  deleted: z.boolean(),
});

export class OsuBeatmapMetadataDto extends createZodDto(
  osuBeatmapMetadataDtoSchema,
) {}
