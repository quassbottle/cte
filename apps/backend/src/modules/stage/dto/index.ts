import { dateToIsoString, isoStringToDate } from 'lib/common/utils/zod/date';
import { stageIdSchema } from 'lib/domain/stage/stage.id';
import { stageTypeSchema } from 'lib/domain/stage/stage.type';
import { tournamentIdSchema } from 'lib/domain/tournament/tournament.id';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const stageDtoSchema = z.object({
  id: stageIdSchema,
  name: z.string(),
  type: stageTypeSchema,
  tournamentId: tournamentIdSchema,
  startsAt: dateToIsoString,
  endsAt: dateToIsoString,
  deletedAt: dateToIsoString.nullable(),
  createdAt: dateToIsoString,
  updatedAt: dateToIsoString,
});

export class StageDto extends createZodDto(stageDtoSchema) {}

export const createStageDtoSchema = z
  .object({
    name: z.string().trim().min(1),
    type: stageTypeSchema.default('regular'),
    startsAt: isoStringToDate,
    endsAt: isoStringToDate,
  })
  .refine((data) => data.endsAt > data.startsAt, {
    path: ['endsAt'],
    message: 'endsAt must be greater than startsAt',
  });

export class CreateStageDto extends createZodDto(createStageDtoSchema) {}

export const updateStageDtoSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    type: stageTypeSchema.optional(),
    startsAt: isoStringToDate.optional(),
    endsAt: isoStringToDate.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  });

export class UpdateStageDto extends createZodDto(updateStageDtoSchema) {}

export const stageStatisticsQuerySchema = z.object({
  view: z.enum(['teams', 'players']).optional(),
  sortBeatmapId: z.coerce.number().int().positive().optional(),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});
export class StageStatisticsQueryDto extends createZodDto(
  stageStatisticsQuerySchema,
) {}

const stageStatisticsMapSchema = z.object({
  osuBeatmapId: z.number().int(),
  artist: z.string(),
  title: z.string(),
  difficultyName: z.string(),
  coverUrl: z.url(),
  mod: z.string(),
  index: z.number().int(),
});

const stageStatisticsAttemptSchema = z.object({
  gameId: z.number().int(),
  matchId: z.string().nullable(),
  lobbyId: z.string().optional(),
  score: z.number().int(),
  place: z.number().int().positive(),
});

export const stageStatisticsDtoSchema = z.object({
  stageId: stageIdSchema,
  maps: z.array(stageStatisticsMapSchema),
  competitors: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      avatarUrl: z.url().optional(),
      teamName: z.string().optional(),
      seed: z.number().int().positive().optional(),
      maps: z.array(
        z.object({
          osuBeatmapId: z.number().int(),
          attempts: z.array(stageStatisticsAttemptSchema),
        }),
      ),
    }),
  ),
});
export class StageStatisticsDto extends createZodDto(
  stageStatisticsDtoSchema,
) {}
