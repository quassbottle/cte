import { isoStringToDate } from 'lib/common/utils/zod/date';
import { matchIdSchema } from 'lib/domain/match/match.id';
import { stageIdSchema } from 'lib/domain/stage/stage.id';
import { stageTypeSchema } from 'lib/domain/stage/stage.type';
import { teamIdSchema } from 'lib/domain/team/team.id';
import { userIdSchema } from 'lib/domain/user/user.id';
import { parseOsuMatchId } from 'modules/osu-multiplayer-sync/mp-url';
import { userDtoSchema } from 'modules/user/dto';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const scheduleDate = z.preprocess((value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const hasTimeZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
    const date = new Date(hasTimeZone ? value : `${value}Z`);

    return Number.isNaN(date.valueOf()) ? value : date.toISOString();
  }

  return value;
}, z.iso.datetime());

export const matchDtoSchema = z.object({
  id: matchIdSchema,
  name: z.string(),
  stageId: stageIdSchema.nullable(),
  matchNumber: z.number().int().nullable(),
  creatorId: userIdSchema,
  startsAt: isoStringToDate,
  endsAt: isoStringToDate,
  mpUrl: z.string().nullable(),
  vodUrl: z.string().nullable(),
  redTeamId: teamIdSchema.nullable(),
  blueTeamId: teamIdSchema.nullable(),
  createdAt: isoStringToDate,
  updatedAt: isoStringToDate,
});

export type MatchDtoOutput = z.output<typeof matchDtoSchema>;

export class MatchDto extends createZodDto(matchDtoSchema, { codec: true }) {}

export const matchWithParticipantsDtoSchema = matchDtoSchema.extend({
  participants: z.array(userDtoSchema),
});

export class MatchWithParticipantsDto extends createZodDto(
  matchWithParticipantsDtoSchema,
) {}

const schedulePlayerDtoSchema = z.object({
  id: userIdSchema,
  osuId: z.number().int(),
  osuUsername: z.string(),
  avatarUrl: z.url(),
  countryCode: z.string().nullable(),
  seed: z.number().int().nullable(),
  score: z.number().int().nullable(),
  isWinner: z.boolean().nullable(),
});

const scheduleStaffRoleSchema = z.enum(['referee', 'streamer', 'commentator']);

const scheduleTeamDtoSchema = z.object({
  id: teamIdSchema,
  name: z.string(),
});

const scheduleStaffMemberDtoSchema = z.object({
  id: userIdSchema,
  osuId: z.number().int(),
  osuUsername: z.string(),
  avatarUrl: z.url(),
  role: scheduleStaffRoleSchema,
});

export const scheduleMatchDtoSchema = z.object({
  id: matchIdSchema,
  name: z.string(),
  matchNumber: z.number().int().nullable(),
  startsAt: scheduleDate,
  endsAt: scheduleDate,
  mpUrl: z.string().nullable(),
  vodUrl: z.string().nullable(),
  syncStatus: z.enum(['active', 'stopped', 'completed']).nullable(),
  lastSyncedAt: scheduleDate.nullable(),
  redTeam: scheduleTeamDtoSchema.nullable(),
  blueTeam: scheduleTeamDtoSchema.nullable(),
  redScore: z.number().int().nullable(),
  blueScore: z.number().int().nullable(),
  players: z.array(schedulePlayerDtoSchema),
  staff: z.array(scheduleStaffMemberDtoSchema),
});

export class ScheduleMatchDto extends createZodDto(scheduleMatchDtoSchema) {}

export const stageScheduleDtoSchema = z.object({
  id: stageIdSchema,
  name: z.string(),
  type: stageTypeSchema,
  startsAt: scheduleDate,
  endsAt: scheduleDate,
  matches: z.array(scheduleMatchDtoSchema),
});

export type StageSchedule = z.output<typeof stageScheduleDtoSchema>;
export type StageScheduleInput = z.input<typeof stageScheduleDtoSchema>;

export class StageScheduleDto extends createZodDto(stageScheduleDtoSchema) {}

const nullableUrl = z
  .string()
  .trim()
  .url()
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const nullableMpUrl = nullableUrl.refine(
  (value) => value === null || parseOsuMatchId(value) !== null,
  'mpUrl must be an official osu multiplayer URL',
);

const scheduleMatchPlayerInputSchema = z.object({
  userId: userIdSchema,
});

const scheduleMatchStaffInputSchema = z.object({
  userId: userIdSchema,
  role: scheduleStaffRoleSchema,
});

export const scheduleMatchUpsertDtoSchema = z
  .object({
    name: z.string().trim().min(1),
    stageId: stageIdSchema,
    matchNumber: z.number().int().positive().nullable().optional(),
    startsAt: isoStringToDate,
    endsAt: isoStringToDate,
    mpUrl: nullableMpUrl,
    vodUrl: nullableUrl,
    redTeamId: teamIdSchema
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    blueTeamId: teamIdSchema
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    players: z.array(scheduleMatchPlayerInputSchema).max(2).default([]),
    staff: z.array(scheduleMatchStaffInputSchema).default([]),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    path: ['endsAt'],
    message: 'endsAt must be greater than startsAt',
  })
  .refine((data) => (data.redTeamId === null) === (data.blueTeamId === null), {
    message: 'Both teams must be provided together',
    path: ['redTeamId'],
  })
  .refine(
    (data) =>
      data.redTeamId === null ||
      (data.redTeamId !== data.blueTeamId && data.players.length === 0),
    {
      message: 'Team matches require distinct teams and no players',
      path: ['redTeamId'],
    },
  )
  .refine(
    (data) =>
      data.staff.filter((staff) => staff.role === 'referee').length <= 1,
    {
      path: ['staff'],
      message: 'Only one referee is allowed',
    },
  )
  .refine(
    (data) =>
      data.staff.filter((staff) => staff.role === 'streamer').length <= 1,
    {
      path: ['staff'],
      message: 'Only one streamer is allowed',
    },
  );

export class ScheduleMatchUpsertDto extends createZodDto(
  scheduleMatchUpsertDtoSchema,
) {}

export type ScheduleMatchUpsertInput = z.output<
  typeof scheduleMatchUpsertDtoSchema
>;
