jest.mock('osu-api-extended', () => ({
  auth: { login: jest.fn(), build_url: jest.fn() },
  v2: {},
}));

import { EnvService } from 'lib/common/env/env.service';
import { auth } from 'osu-api-extended';
import { OsuService } from './osu.service';

describe('OsuService guest authentication', () => {
  it('retries after a transient login failure', async () => {
    const login = auth.login as jest.Mock;
    login
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValueOnce({});
    const env = {
      get: jest.fn(
        (key: string) =>
          ({
            OSU_CLIENT_ID: 1,
            OSU_CLIENT_SECRET: 'secret',
            OSU_REDIRECT_URL: 'http://localhost/callback',
          })[key],
      ),
    } as unknown as EnvService;
    const service = new OsuService(env);

    await expect(service.getGuestClient()).rejects.toThrow('ETIMEDOUT');
    await expect(service.getGuestClient()).resolves.toBeDefined();
    expect(login).toHaveBeenCalledTimes(2);
  });
});
