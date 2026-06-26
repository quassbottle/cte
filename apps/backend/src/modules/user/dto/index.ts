import { tournamentModeSchema } from 'lib/domain/tournament/tournament.mode';
import { userRoleSchema } from 'lib/domain/user/user.role';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const userResponseSchema = z
  .object({
    id: z.cuid2(),
    osuId: z.number().describe('The osu! user ID'),
    osuUsername: z.string().describe('The osu! username'),
    countryCode: z.string().nullable(),
    osuCoverUrl: z
      .url()
      .nullable()
      .describe('The osu! profile cover image URL'),
    defaultMode: tournamentModeSchema.describe('The default osu! game mode'),
    role: userRoleSchema.describe('The user role'),
    avatarUrl: z.url().describe('The osu! avatar image URL'),
    createdAt: z.iso.datetime().describe('The user creation date'),
    updatedAt: z.iso.datetime().describe('The user last update date'),
  })
  .strict();

const userDbSchema = z
  .object({
    id: z.cuid2(),
    osuId: z.number(),
    osuUsername: z.string(),
    countryCode: z.string().nullable(),
    osuCoverUrl: z.url().nullable(),
    defaultMode: tournamentModeSchema,
    role: userRoleSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .strict();

export const userDtoSchema = z.codec(userResponseSchema, userDbSchema, {
  decode: (user) => ({
    id: user.id,
    osuId: user.osuId,
    osuUsername: user.osuUsername,
    countryCode: user.countryCode,
    osuCoverUrl: user.osuCoverUrl,
    defaultMode: user.defaultMode,
    role: user.role,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  }),
  encode: (user) => ({
    id: user.id,
    osuId: user.osuId,
    osuUsername: user.osuUsername,
    countryCode: user.countryCode,
    osuCoverUrl: user.osuCoverUrl,
    defaultMode: user.defaultMode,
    role: user.role,
    avatarUrl: `https://a.ppy.sh/${user.osuId}`,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }),
});

export type UserDtoOutput = z.output<typeof userDtoSchema>;

export class UserDto extends createZodDto(userDtoSchema, { codec: true }) {}
