const mockLogin = jest.fn();
const mockMatchesDetails = jest.fn();

jest.mock('osu-api-extended', () => ({
  auth: { login: mockLogin },
  v2: { matches: { details: mockMatchesDetails } },
}));

import { EnvService } from 'lib/common/env/env.service';
import { OsuService } from './osu.service';

describe('OsuService', () => {
  it('keeps Score V2 games and ignores invalid Score games', async () => {
    mockLogin.mockResolvedValue({});
    mockMatchesDetails.mockResolvedValue({
      match: { end_time: '2026-04-18T04:27:09Z' },
      latest_event_id: 1,
      events: [
        {
          id: 0,
          game: {
            id: 9,
            beatmap_id: 5616113,
            end_time: '2026-04-18T03:20:19Z',
            scoring_type: 'score',
            mods: ['NF'],
            scores: [
              {
                user_id: 16536516,
                legacy_total_score: 1183210,
                mods: [],
                max_combo: 1457,
                accuracy: 0.9872,
                rank: 'A',
                statistics: { great: 1463 },
                match: { team: 'blue' },
              },
            ],
          },
        },
        {
          id: 1,
          game: {
            id: 10,
            beatmap_id: 5616113,
            end_time: '2026-04-18T03:23:19Z',
            scoring_type: 'scorev2',
            mods: ['NF'],
            scores: [
              {
                user_id: 16536516,
                legacy_total_score: 966909,
                mods: [{ acronym: 'HD' }, { acronym: 'HR' }],
                max_combo: 1457,
                accuracy: 0.9872,
                rank: 'A',
                statistics: {
                  great: 1463,
                  ok: 16,
                  miss: 11,
                },
                match: { team: 'blue' },
              },
              {
                user_id: 4050738,
                legacy_total_score: 920079,
                mods: [],
                max_combo: 814,
                accuracy: 1,
                rank: 'A',
                statistics: { great: 1440 },
                match: { team: 'red' },
              },
            ],
          },
        },
      ],
    });
    const env = {
      get: jest.fn(
        (key: string) =>
          ({
            OSU_CLIENT_ID: 1,
            OSU_CLIENT_SECRET: 'secret',
            OSU_REDIRECT_URL: 'http://localhost',
          })[key],
      ),
    } as unknown as EnvService;

    await expect(
      new OsuService(env).getMatchSnapshot({ osuMatchId: 120962349 }),
    ).resolves.toMatchObject({
      games: [
        {
          beatmapId: 5616113,
          scores: [
            {
              userId: 16536516,
              score: 966909,
              mods: ['NF', 'HD', 'HR'],
              maxCombo: 1457,
              accuracy: 0.9872,
              rank: 'A',
              great: 1463,
              ok: 16,
              miss: 11,
            },
            {
              userId: 4050738,
              score: 920079,
              mods: ['NF'],
              great: 1440,
              ok: 0,
              miss: 0,
            },
          ],
        },
      ],
    });
  });
});
