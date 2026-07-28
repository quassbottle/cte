import { isoStringToDate } from 'lib/common/utils/zod/date';
import { qualificationLobbyIdSchema } from 'lib/domain/qualification-lobby/qualification-lobby.id';
import { stageIdSchema } from 'lib/domain/stage/stage.id';
import { teamIdSchema } from 'lib/domain/team/team.id';
import { userIdSchema } from 'lib/domain/user/user.id';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const lobbyInput = z
  .object({
    stageId: stageIdSchema,
    number: z.number().int().positive(),
    refereeId: userIdSchema,
    startsAt: isoStringToDate,
    endsAt: isoStringToDate,
    mpUrl: z.url().nullable().optional(),
  })
  .refine(({ startsAt, endsAt }) => endsAt > startsAt, {
    path: ['endsAt'],
    message: 'endsAt must be greater than startsAt',
  });

export class QualificationLobbyUpsertDto extends createZodDto(lobbyInput) {}
export class SelectQualificationLobbySoloDto extends createZodDto(
  z.object({}),
) {}
export class SelectQualificationLobbyTeamDto extends createZodDto(
  z.object({ teamId: teamIdSchema }),
) {}

const qualificationAttemptDtoSchema = z.object({
  beatmapId: z.number().int(),
  gameId: z.number().int(),
  osuUserId: z.number().int(),
  userId: userIdSchema.nullable(),
  userName: z.string().nullable(),
  score: z.number().int(),
  mods: z.array(z.string()),
  maxCombo: z.number().int(),
  accuracy: z.number(),
  rank: z.string(),
  great: z.number().int().nullable(),
  ok: z.number().int().nullable(),
  miss: z.number().int().nullable(),
  counted: z.boolean(),
});

const qualificationStandingDtoSchema = z.object({
  competitorId: z.string(),
  beatmapId: z.number().int(),
  gameId: z.number().int(),
  score: z.number().int(),
  place: z.number().int().positive(),
});

export const qualificationLobbyDtoSchema = z.object({
  id: qualificationLobbyIdSchema,
  stageId: stageIdSchema,
  number: z.number().int().positive(),
  referee: z.object({
    id: userIdSchema,
    osuId: z.number().int(),
    osuUsername: z.string(),
    avatarUrl: z.url(),
    role: z.literal('referee'),
  }),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  mpUrl: z.url().nullable().optional(),
  players: z.array(z.object({ id: userIdSchema, name: z.string() })),
  teams: z.array(z.object({ id: teamIdSchema, name: z.string() })),
  seatCount: z.number().int().min(0).max(16),
  syncStatus: z.enum(['active', 'stopped', 'completed']).nullable(),
  lastSyncedAt: z.iso.datetime().nullable(),
});
export class QualificationLobbyDto extends createZodDto(
  qualificationLobbyDtoSchema,
) {}

export const qualificationLobbyHistoryDtoSchema = z.object({
  lastSyncedAt: z.iso.datetime().nullable(),
  attempts: z.array(qualificationAttemptDtoSchema),
  standings: z.array(qualificationStandingDtoSchema),
});
export class QualificationLobbyHistoryDto extends createZodDto(
  qualificationLobbyHistoryDtoSchema,
) {}

export const qualificationStatisticsQuerySchema = z.object({
  sortBeatmapId: z.coerce.number().int().positive().optional(),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});
export class QualificationStatisticsQueryDto extends createZodDto(
  qualificationStatisticsQuerySchema,
) {}

export const qualificationStatisticsDtoSchema = z.object({
  stageId: stageIdSchema,
  maps: z.array(
    z.object({
      osuBeatmapId: z.number().int(),
      artist: z.string(),
      title: z.string(),
      difficultyName: z.string(),
      coverUrl: z.url(),
      mod: z.string(),
      index: z.number().int(),
    }),
  ),
  competitors: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      seed: z.number().int().positive(),
      maps: z.array(
        z.object({
          osuBeatmapId: z.number().int(),
          attempts: z.array(
            z.object({
              gameId: z.number().int(),
              matchId: z.string().nullable(),
              score: z.number().int(),
              place: z.number().int().positive(),
            }),
          ),
        }),
      ),
    }),
  ),
});
export class QualificationStatisticsDto extends createZodDto(
  qualificationStatisticsDtoSchema,
) {}
