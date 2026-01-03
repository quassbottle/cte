import { isoStringToDate } from 'lib/common/utils/zod/date';
import { createZodDto } from 'nestjs-zod/dto';
import z from 'zod';

export const userDtoSchema = z
  .object({
    id: z.cuid2(),
    osuId: z.number().describe('The osu! user ID'),
    osuUsername: z.string().describe('The osu! username'),
    createdAt: isoStringToDate.describe('The user creation date'),
    updatedAt: isoStringToDate.describe('The user last update date'),
  })
  .transform((u) => ({
    id: u.id,
    osuId: u.osuId,
    osuUsername: u.osuUsername,
    avatarUrl: `https://a.ppy.sh/${u.osuId}`,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

export class UserDto extends createZodDto(userDtoSchema) {}
