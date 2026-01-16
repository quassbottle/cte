import 'dotenv/config';
import { envSchema } from './env';

const env = envSchema.parse(process.env);

export const Config = {
  host: env.OSU_IRC_HOST,
  port: env.OSU_IRC_PORT,
  nick: env.OSU_IRC_NICK,
  password: env.OSU_IRC_PASSWORD,
  nats: {
    host: env.NATS_HOST,
    port: env.NATS_PORT,
    user: env.NATS_USER,
    password: env.NATS_PASSWORD,
  },
  databaseUrl: env.DATABASE_URL,
  osu: {
    clientId: env.OSU_CLIENT_ID,
    clientSecret: env.OSU_CLIENT_SECRET,
    login: env.OSU_LOGIN,
    password: env.OSU_PASSWORD,
    redirectUrl: env.OSU_REDIRECT_URL,
  },
};

export type Config = typeof Config;
