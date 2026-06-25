import { isoStringToDate } from 'lib/common/utils/zod/date';
import { matchIdSchema } from 'lib/domain/match/match.id';
import { stageIdSchema } from 'lib/domain/stage/stage.id';
import { userIdSchema } from 'lib/domain/user/user.id';
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
  createdAt: isoStringToDate,
  updatedAt: isoStringToDate,
});

export class MatchDto extends createZodDto(matchDtoSchema) {}

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
  countryCode: z.string().nullable(),
  seed: z.number().int().nullable(),
  score: z.number().int().nullable(),
  isWinner: z.boolean().nullable(),
});

const scheduleStaffRoleSchema = z.enum(['referee', 'streamer', 'commentator']);

const scheduleStaffMemberDtoSchema = z.object({
  id: userIdSchema,
  osuId: z.number().int(),
  osuUsername: z.string(),
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
  players: z.array(schedulePlayerDtoSchema),
  staff: z.array(scheduleStaffMemberDtoSchema),
});

export class ScheduleMatchDto extends createZodDto(scheduleMatchDtoSchema) {}

export const stageScheduleDtoSchema = z.object({
  id: stageIdSchema,
  name: z.string(),
  startsAt: scheduleDate,
  endsAt: scheduleDate,
  matches: z.array(scheduleMatchDtoSchema),
});

export type StageSchedule = z.output<typeof stageScheduleDtoSchema>;
export type StageScheduleInput = z.input<typeof stageScheduleDtoSchema>;

export class StageScheduleDto extends createZodDto(stageScheduleDtoSchema) {}
