import 'dotenv/config';
import { envSchema } from './env';

const env = envSchema.parse(process.env);

export const Config = {
  host: env.OSU_IRC_HOST,
  port: env.OSU_IRC_PORT,
  nick: env.OSU_IRC_NICK,
  password: env.OSU_IRC_PASSWORD,
  databaseUrl: env.DATABASE_URL,
  osuClientId: env.OSU_CLIENT_ID,
  osuClientSecret: env.OSU_CLIENT_SECRET,
  osuRedirectUrl: env.OSU_REDIRECT_URL,
  osuAccessToken: env.OSU_ACCESS_TOKEN,
};

export type Config = typeof Config;
