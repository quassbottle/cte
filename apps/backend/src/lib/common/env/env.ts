import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string(),
  OSU_CLIENT_ID: z.coerce.string().transform(Number),
  OSU_CLIENT_SECRET: z.string(),
  OSU_REDIRECT_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.coerce.string().transform(Number),
});
export type Env = z.infer<typeof envSchema>;
