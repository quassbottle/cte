import { z } from 'zod';

export const envSchema = z.object({
  OSU_IRC_HOST: z.string().default('irc.ppy.sh'),
  OSU_IRC_PORT: z.coerce.number().int().positive().default(6667),
  OSU_IRC_NICK: z.string().min(1, 'OSU_IRC_NICK is required'),
  OSU_IRC_PASSWORD: z.string().min(1, 'OSU_IRC_PASSWORD is required'),
  NATS_HOST: z.string().default('localhost'),
  NATS_PORT: z.coerce.number().int().positive().default(4222),
  NATS_USER: z.string().optional(),
  NATS_PASSWORD: z.string().optional(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  OSU_CLIENT_ID: z.coerce
    .string()
    .min(1, 'OSU_CLIENT_ID is required')
    .transform(Number),
  OSU_CLIENT_SECRET: z.string().min(1, 'OSU_CLIENT_SECRET is required'),
  OSU_REDIRECT_URL: z.string().min(1, 'OSU_REDIRECT_URL is required'),
  OSU_LOGIN: z.string().min(1, 'OSU_LOGIN is required'),
  OSU_PASSWORD: z.string().min(1, 'OSU_LOGIN is required'),
});

export type Env = z.infer<typeof envSchema>;
