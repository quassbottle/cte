import { dateToIsoString, isoStringToDate } from 'lib/common/utils/zod/date';
import { paginationSchema } from 'lib/common/utils/zod/pagination';
import { teamIdSchema } from 'lib/domain/team/team.id';
import { staffRoleIdSchema } from 'lib/domain/staff-role/staff-role.id';
import { tournamentIdSchema } from 'lib/domain/tournament/tournament.id';
import { tournamentModeSchema } from 'lib/domain/tournament/tournament.mode';
import { userIdSchema } from 'lib/domain/user/user.id';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const tournamentDtoSchema = z.object({
  id: tournamentIdSchema,
  name: z.string(),
  description: z.string().nullable(),
  rules: z.string().nullable(),
  mode: tournamentModeSchema,
  isTeam: z.boolean(),
  participantsCount: z.number().int().nonnegative(),
  registrationOpen: z.boolean(),
  creatorId: userIdSchema,
  startsAt: dateToIsoString,
  endsAt: dateToIsoString,
  archivedAt: dateToIsoString.nullable(),
  deletedAt: dateToIsoString.nullable(),
  createdAt: dateToIsoString,
  updatedAt: dateToIsoString,
});

export class TournamentDto extends createZodDto(tournamentDtoSchema) {}

export const findTournamentsDtoSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  mode: tournamentModeSchema.optional(),
  status: z.enum(['active', 'archived']).optional().default('active'),
});

export class FindTournamentsDto extends createZodDto(
  findTournamentsDtoSchema,
) {}

export const createTournamentDtoSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().nullish(),
    rules: z.string().trim().nullish(),
    mode: tournamentModeSchema.optional().default('osu'),
    isTeam: z.boolean().optional().default(false),
    registrationOpen: z.boolean().optional().default(true),
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
    mode: tournamentModeSchema.optional(),
    isTeam: z.boolean().optional(),
    registrationOpen: z.boolean().optional(),
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

const competitorSearchSchema = paginationSchema.extend({
  query: z.string().trim().optional(),
});

export class FindTournamentParticipantsDto extends createZodDto(
  competitorSearchSchema,
) {}

export class FindTournamentTeamsDto extends createZodDto(
  competitorSearchSchema,
) {}

const tournamentParticipantResponseSchema = z.object({
  id: userIdSchema,
  osuId: z.number(),
  osuUsername: z.string(),
  avatarUrl: z.url(),
});

const tournamentParticipantDbSchema = z
  .object({
    id: userIdSchema,
    osuId: z.number(),
    osuUsername: z.string(),
  })
  .passthrough();

export const tournamentParticipantDtoSchema = z.codec(
  tournamentParticipantResponseSchema,
  tournamentParticipantDbSchema,
  {
    decode: (participant) => ({
      id: userIdSchema.parse(participant.id),
      osuId: participant.osuId,
      osuUsername: participant.osuUsername,
    }),
    encode: (participant) => ({
      id: userIdSchema.parse(participant.id),
      osuId: participant.osuId,
      osuUsername: participant.osuUsername,
      avatarUrl: `https://a.ppy.sh/${participant.osuId}`,
    }),
  },
);

export class TournamentParticipantDto extends createZodDto(
  tournamentParticipantDtoSchema,
  { codec: true },
) {}

export const tournamentTeamDtoSchema = z.object({
  id: teamIdSchema,
  name: z.string(),
  captainId: userIdSchema,
  participants: z.array(tournamentParticipantDtoSchema),
});

export class TournamentTeamDto extends createZodDto(tournamentTeamDtoSchema, {
  codec: true,
}) {}

export const tournamentStaffRoleDtoSchema = z.object({
  id: staffRoleIdSchema,
  name: z.string(),
  members: z.array(tournamentParticipantDtoSchema),
});

export class TournamentStaffRoleDto extends createZodDto(
  tournamentStaffRoleDtoSchema,
  { codec: true },
) {}

export const assignTournamentStaffDtoSchema = z.object({
  roleId: staffRoleIdSchema,
  userId: userIdSchema,
});

export class AssignTournamentStaffDto extends createZodDto(
  assignTournamentStaffDtoSchema,
) {}

export const tournamentTeamSummaryDtoSchema = z.object({
  id: teamIdSchema,
  name: z.string(),
});

export class TournamentTeamSummaryDto extends createZodDto(
  tournamentTeamSummaryDtoSchema,
) {}

export const updateQualificationCompetitorDtoSchema = z
  .object({
    seed: z.number().int().positive().nullable().optional(),
    withdrawn: z.boolean().optional(),
    withdrawalReason: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export class UpdateQualificationCompetitorDto extends createZodDto(
  updateQualificationCompetitorDtoSchema,
) {}

export const updateQualificationTeamParticipantDtoSchema = z
  .object({
    withdrawn: z.boolean().optional(),
    withdrawalReason: z.string().trim().max(1000).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export class UpdateQualificationTeamParticipantDto extends createZodDto(
  updateQualificationTeamParticipantDtoSchema,
) {}

export type UpdateQualificationCompetitorInput = z.infer<
  typeof updateQualificationCompetitorDtoSchema
>;

const managedUserSchema = z.object({
  id: userIdSchema,
  osuId: z.number(),
  osuUsername: z.string(),
  avatarUrl: z.url(),
  withdrawn: z.boolean(),
  withdrawalReason: z.string().nullable(),
});

const managedSoloSchema = managedUserSchema.extend({
  seed: z.number().int().positive().nullable(),
});

const managedTeamSchema = z.object({
  id: teamIdSchema,
  name: z.string(),
  seed: z.number().int().positive().nullable(),
  withdrawn: z.boolean(),
  withdrawalReason: z.string().nullable(),
  participants: z.array(managedUserSchema),
});

export const qualificationRosterDtoSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('solo'),
    participants: z.array(managedSoloSchema),
  }),
  z.object({ kind: z.literal('team'), teams: z.array(managedTeamSchema) }),
]);

export const QualificationRosterDto = createZodDto(
  qualificationRosterDtoSchema,
);

export type QualificationRosterInput = z.infer<
  typeof qualificationRosterDtoSchema
>;
