import { z } from 'zod';

export const envSchema = z.object({
  OSU_IRC_HOST: z.string().default('irc.ppy.sh'),
  OSU_IRC_PORT: z.coerce.number().int().positive().default(6667),
  OSU_IRC_NICK: z.string().min(1, 'OSU_IRC_NICK is required'),
  OSU_IRC_PASSWORD: z.string().min(1, 'OSU_IRC_PASSWORD is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  OSU_CLIENT_ID: z.coerce
    .string()
    .min(1, 'OSU_CLIENT_ID is required')
    .transform(Number),
  OSU_CLIENT_SECRET: z.string().min(1, 'OSU_CLIENT_SECRET is required'),
  OSU_REDIRECT_URL: z.string().min(1, 'OSU_REDIRECT_URL is required'),
  OSU_ACCESS_TOKEN: z.string().min(1, 'OSU_ACCESS_TOKEN is required'),
});

export type Env = z.infer<typeof envSchema>;
