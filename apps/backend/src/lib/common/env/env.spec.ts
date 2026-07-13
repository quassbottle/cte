import { envSchema } from './env';

const required = {
  DATABASE_URL: 'postgres://localhost/db',
  OSU_CLIENT_ID: '1',
  OSU_CLIENT_SECRET: 'secret',
  OSU_REDIRECT_URL: 'http://localhost/callback',
  JWT_SECRET: 'secret',
  JWT_EXPIRES_IN: '60',
};

describe('envSchema', () => {
  it('provides positive osu match sync defaults', () => {
    const env = envSchema.parse(required);

    expect(env.OSU_MATCH_SYNC_POLL_INTERVAL_MS).toBe(15_000);
    expect(env.OSU_MATCH_SYNC_LEASE_MS).toBe(60_000);
    expect(env.OSU_MATCH_SYNC_BATCH_SIZE).toBe(10);
    expect(env.OSU_MATCH_SYNC_MAX_BACKOFF_MS).toBe(300_000);
  });

  it('rejects non-positive sync settings', () => {
    expect(() =>
      envSchema.parse({ ...required, OSU_MATCH_SYNC_BATCH_SIZE: '0' }),
    ).toThrow();
  });
});
