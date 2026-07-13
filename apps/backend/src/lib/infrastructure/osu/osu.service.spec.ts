const mockLogin = jest.fn();
const mockMatchesDetails = jest.fn();

jest.mock('osu-api-extended', () => ({
  auth: { login: mockLogin },
  v2: { matches: { details: mockMatchesDetails } },
}));

import { EnvService } from 'lib/common/env/env.service';
import { OsuService } from './osu.service';

describe('OsuService', () => {
  it('uses the legacy multiplayer total score returned by osu', async () => {
    mockLogin.mockResolvedValue({});
    mockMatchesDetails.mockResolvedValue({
      match: { end_time: '2026-04-18T04:27:09Z' },
      latest_event_id: 1,
      events: [
        {
          id: 1,
          game: {
            id: 10,
            beatmap_id: 5616113,
            end_time: '2026-04-18T03:23:19Z',
            scores: [
              {
                user_id: 16536516,
                legacy_total_score: 966909,
                match: { team: 'blue' },
              },
              {
                user_id: 4050738,
                legacy_total_score: 920079,
                match: { team: 'red' },
              },
            ],
          },
        },
      ],
    });
    const env = {
      get: jest.fn((key: string) =>
        ({
          OSU_CLIENT_ID: 1,
          OSU_CLIENT_SECRET: 'secret',
          OSU_REDIRECT_URL: 'http://localhost',
        })[key],
      ),
    } as unknown as EnvService;

    await expect(new OsuService(env).getMatchSnapshot({ osuMatchId: 120962349 }))
      .resolves.toMatchObject({
        games: [
          {
            beatmapId: 5616113,
            scores: [
              { userId: 16536516, score: 966909 },
              { userId: 4050738, score: 920079 },
            ],
          },
        ],
      });
  });
});
