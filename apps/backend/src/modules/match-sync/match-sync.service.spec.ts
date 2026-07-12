import { MatchSyncService } from './match-sync.service';

describe('MatchSyncService', () => {
  it('recalculates and writes one claimed match', async () => {
    const lease = {
      matchId: 'match',
      osuMatchId: 1,
      leaseToken: 'token',
      status: 'active' as const,
    };
    const input = {
      players: [
        { userId: 'a', osuId: 1 },
        { userId: 'b', osuId: 2 },
      ] as never,
      allowedBeatmapIds: new Set([10]),
    };
    const repository = {
      loadInput: jest.fn().mockResolvedValue(input),
      applySuccess: jest.fn().mockResolvedValue(true),
    };
    const client = {
      get: jest.fn().mockResolvedValue({
        closedAt: null,
        games: [
          {
            id: 1,
            beatmapId: 10,
            endedAt: new Date(),
            scores: [
              { userId: 1, score: 2 },
              { userId: 2, score: 1 },
            ],
          },
        ],
      }),
    };

    await expect(
      new MatchSyncService(repository as never, client as never).syncOnce(
        lease,
        true,
      ),
    ).resolves.toBe(true);
    expect(repository.applySuccess).toHaveBeenCalledWith(
      expect.objectContaining({ lease, background: true }),
    );
  });
});
