import { createZodDto } from 'nestjs-zod/dto';
import z from 'zod';

export const osuBeatmapMetadataDtoSchema = z.object({
  difficulty: z.number(),
  version: z.number().int(),
  deleted: z.boolean(),
});

export class OsuBeatmapMetadataDto extends createZodDto(
  osuBeatmapMetadataDtoSchema,
) {}
