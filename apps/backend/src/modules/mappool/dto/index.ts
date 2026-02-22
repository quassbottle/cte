import { dateToIsoString, isoStringToDate } from 'lib/common/utils/zod/date';
import { mappoolIdSchema } from 'lib/domain/mappool/mappool.id';
import { stageIdSchema } from 'lib/domain/stage/stage.id';
import { mappoolBeatmapViewSchema } from 'modules/beatmap/types';
import { createZodDto } from 'nestjs-zod/dto';
import z from 'zod';

export const mappoolDtoSchema = z.object({
  id: mappoolIdSchema,
  stageId: stageIdSchema,
  startsAt: dateToIsoString,
  endsAt: dateToIsoString,
  hidden: z.boolean(),
  createdAt: dateToIsoString,
  updatedAt: dateToIsoString,
});

export class MappoolDto extends createZodDto(mappoolDtoSchema) {}

export const createMappoolDtoSchema = z
  .object({
    stageId: stageIdSchema,
    startsAt: isoStringToDate,
    endsAt: isoStringToDate,
  })
  .refine((data) => data.endsAt > data.startsAt, {
    path: ['endsAt'],
    message: 'endsAt must be greater than startsAt',
  });

export class CreateMappoolDto extends createZodDto(createMappoolDtoSchema) {}

export const updateMappoolDtoSchema = z
  .object({
    startsAt: isoStringToDate.optional(),
    endsAt: isoStringToDate.optional(),
    hidden: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  });

export class UpdateMappoolDto extends createZodDto(updateMappoolDtoSchema) {}

export const addMappoolBeatmapDtoSchema = z.object({
  mod: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  beatmapsetId: z.number().int().positive(),
  beatmapId: z.number().int().positive(),
});

export class AddMappoolBeatmapDto extends createZodDto(
  addMappoolBeatmapDtoSchema,
) {}

export const updateMappoolBeatmapDtoSchema = z
  .object({
    mod: z
      .string()
      .trim()
      .min(1)
      .transform((value) => value.toUpperCase())
      .optional(),
    index: z.number().int().positive().optional(),
    beatmapsetId: z.number().int().positive().optional(),
    beatmapId: z.number().int().positive().optional(),
  })
  .refine(
    (data) =>
      data.mod !== undefined ||
      data.index !== undefined ||
      data.beatmapsetId !== undefined ||
      data.beatmapId !== undefined,
    {
      message: 'At least one field is required',
    },
  )
  .refine(
    (data) =>
      (data.beatmapsetId === undefined && data.beatmapId === undefined) ||
      (data.beatmapsetId !== undefined && data.beatmapId !== undefined),
    {
      message: 'beatmapsetId and beatmapId must be provided together',
      path: ['beatmapId'],
    },
  )
  .refine(
    (data) =>
      (data.beatmapsetId === undefined && data.beatmapId === undefined) ||
      data.mod === undefined,
    {
      message: 'Cannot change beatmap and mod in one request',
      path: ['mod'],
    },
  )
  .refine(
    (data) =>
      (data.beatmapsetId === undefined && data.beatmapId === undefined) ||
      data.index === undefined,
    {
      message: 'Cannot change beatmap and index in one request',
      path: ['index'],
    },
  );

export class UpdateMappoolBeatmapDto extends createZodDto(
  updateMappoolBeatmapDtoSchema,
) {}

export const mappoolBeatmapDtoSchema = mappoolBeatmapViewSchema.extend({
  createdAt: dateToIsoString,
  updatedAt: dateToIsoString,
});

export class MappoolBeatmapDto extends createZodDto(mappoolBeatmapDtoSchema) {}
