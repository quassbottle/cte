import { isoStringToDate } from 'lib/common/utils/zod/date';
import { matchIdSchema } from 'lib/domain/match/match.id';
import { userIdSchema } from 'lib/domain/user/user.id';
import { userDtoSchema } from 'modules/user/dto';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const matchDtoSchema = z.object({
  id: matchIdSchema,
  name: z.string(),
  creatorId: userIdSchema,
  startsAt: isoStringToDate,
  endsAt: isoStringToDate,
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
