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
    mpUrl: z.string().url().nullable().optional(),
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

export const qualificationLobbyDtoSchema = z.object({
  id: qualificationLobbyIdSchema,
  stageId: stageIdSchema,
  number: z.number().int().positive(),
  refereeId: userIdSchema,
  refereeName: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  mpUrl: z.string().url().nullable().optional(),
  players: z.array(z.object({ id: userIdSchema, name: z.string() })),
  teams: z.array(z.object({ id: teamIdSchema, name: z.string() })),
  seatCount: z.number().int().min(0).max(16),
  syncStatus: z.enum(['active', 'stopped', 'completed']).nullable(),
  lastSyncedAt: z.string().nullable(),
  attempts: z.array(
    z.object({
      beatmapId: z.number().int(),
      gameId: z.number().int(),
      osuUserId: z.number().int(),
      userId: userIdSchema.nullable(),
      userName: z.string().nullable(),
      score: z.number().int(),
    }),
  ),
});
export class QualificationLobbyDto extends createZodDto(
  qualificationLobbyDtoSchema,
) {}
