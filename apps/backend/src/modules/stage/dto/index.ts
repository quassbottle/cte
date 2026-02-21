import { dateToIsoString, isoStringToDate } from 'lib/common/utils/zod/date';
import { stageIdSchema } from 'lib/domain/stage/stage.id';
import { tournamentIdSchema } from 'lib/domain/tournament/tournament.id';
import { createZodDto } from 'nestjs-zod/dto';
import z from 'zod';

export const stageDtoSchema = z.object({
  id: stageIdSchema,
  name: z.string(),
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
    startsAt: isoStringToDate.optional(),
    endsAt: isoStringToDate.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  });

export class UpdateStageDto extends createZodDto(updateStageDtoSchema) {}
