import { OsuService } from 'lib/infrastructure/osu/osu.service';
import { OsuMatchClient } from './osu-match.client';

describe('OsuMatchClient', () => {
  it('delegates snapshot loading to infrastructure osu service', async () => {
    const snapshot = { closedAt: null, games: [] };
    const osu = {
      getMatchSnapshot: jest.fn().mockResolvedValue(snapshot),
    } as unknown as OsuService;

    await expect(new OsuMatchClient(osu).get(123)).resolves.toBe(snapshot);
    expect(osu.getMatchSnapshot).toHaveBeenCalledWith({ osuMatchId: 123 });
  });
});
