import { dateToIsoString, isoStringToDate } from 'lib/common/utils/zod/date';
import { beatmapIdSchema } from 'lib/domain/beatmap/beatmap.id';
import { mappoolIdSchema } from 'lib/domain/mappool/mappool.id';
import { stageIdSchema } from 'lib/domain/stage/stage.id';
import { createZodDto } from 'nestjs-zod/dto';
import z from 'zod';

export const mappoolDtoSchema = z.object({
  id: mappoolIdSchema,
  stageId: stageIdSchema,
  startsAt: dateToIsoString,
  endsAt: dateToIsoString,
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
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  });

export class UpdateMappoolDto extends createZodDto(updateMappoolDtoSchema) {}

export const addMappoolBeatmapDtoSchema = z.object({
  beatmapId: beatmapIdSchema,
});

export class AddMappoolBeatmapDto extends createZodDto(
  addMappoolBeatmapDtoSchema,
) {}
