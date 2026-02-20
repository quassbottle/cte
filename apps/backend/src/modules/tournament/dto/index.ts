import { dateToIsoString, isoStringToDate } from 'lib/common/utils/zod/date';
import { tournamentIdSchema } from 'lib/domain/tournament/tournament.id';
import { userIdSchema } from 'lib/domain/user/user.id';
import { createZodDto } from 'nestjs-zod/dto';
import z from 'zod';

export const tournamentDtoSchema = z.object({
  id: tournamentIdSchema,
  name: z.string(),
  description: z.string().nullable(),
  rules: z.string().nullable(),
  isTeam: z.boolean(),
  creatorId: userIdSchema,
  startsAt: dateToIsoString,
  endsAt: dateToIsoString,
  deletedAt: dateToIsoString.nullable(),
  createdAt: dateToIsoString,
  updatedAt: dateToIsoString,
});

export class TournamentDto extends createZodDto(tournamentDtoSchema) {}

export const createTournamentDtoSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().nullish(),
    rules: z.string().trim().nullish(),
    isTeam: z.boolean().optional().default(false),
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
    isTeam: z.boolean().optional(),
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

const registerTeamDtoSchema = z.object({
  name: z.string().trim().min(1),
  participants: z.array(userIdSchema).min(1),
});

export const registerTournamentDtoSchema = z.object({
  team: registerTeamDtoSchema.optional(),
});

export class RegisterTournamentDto extends createZodDto(
  registerTournamentDtoSchema,
) {}

export const tournamentParticipantDtoSchema = z.object({
  id: userIdSchema,
  osuId: z.number(),
  osuUsername: z.string(),
});

export class TournamentParticipantDto extends createZodDto(
  tournamentParticipantDtoSchema,
) {}
