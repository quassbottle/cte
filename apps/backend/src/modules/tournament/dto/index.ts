import { isoStringToDate } from 'lib/common/utils/zod/date';
import { tournamentIdSchema } from 'lib/domain/tournament/tournament.id';
import { userIdSchema } from 'lib/domain/user/user.id';
import { createZodDto } from 'nestjs-zod/dto';
import z from 'zod';

export const tournamentDtoSchema = z.object({
  id: tournamentIdSchema,
  name: z.string(),
  description: z.string().nullable(),
  rules: z.string().nullable(),
  creatorId: userIdSchema,
  startsAt: isoStringToDate,
  endsAt: isoStringToDate,
  deletedAt: isoStringToDate.nullable(),
  createdAt: isoStringToDate,
  updatedAt: isoStringToDate,
});

export class TournamentDto extends createZodDto(tournamentDtoSchema) {}

export const createTournamentDtoSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().nullish(),
    rules: z.string().trim().nullish(),
    startsAt: isoStringToDate,
    endsAt: isoStringToDate,
  })
  .refine((data) => data.endsAt > data.startsAt, {
    path: ['endsAt'],
    message: 'endsAt must be greater than startsAt',
  })
  .transform((data) => ({
    ...data,
    description: data.description ?? null,
    rules: data.rules ?? null,
  }));

export class CreateTournamentDto extends createZodDto(
  createTournamentDtoSchema,
) {}

export const updateTournamentDtoSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().nullish(),
    rules: z.string().trim().nullish(),
    startsAt: isoStringToDate.optional(),
    endsAt: isoStringToDate.optional(),
  })
  .refine(
    (data) =>
      Object.values(data).some((value) => value !== undefined) ||
      'description' in data ||
      'rules' in data,
    { message: 'At least one field is required' },
  )
  .transform((data) => ({
    ...data,
    description:
      data.description === undefined ? undefined : (data.description ?? null),
    rules: data.rules === undefined ? undefined : (data.rules ?? null),
  }));

export class UpdateTournamentDto extends createZodDto(
  updateTournamentDtoSchema,
) {}
