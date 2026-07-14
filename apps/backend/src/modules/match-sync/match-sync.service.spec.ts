import { matchIdSchema } from 'lib/domain/match/match.id';
import { MatchSyncService } from './match-sync.service';

describe('MatchSyncService', () => {
  it('recalculates and writes one claimed match', async () => {
    const lease = {
      matchId: matchIdSchema.parse('ckm123456789012345678901'),
      osuMatchId: 1,
      leaseToken: 'token',
      status: 'active' as const,
    };
    const input = {
      kind: 'solo' as const,
      players: [
        { userId: 'a', osuId: 1 },
        { userId: 'b', osuId: 2 },
      ],
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
              { userId: 1, score: 2, team: null },
              { userId: 2, score: 1, team: null },
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
      expect.objectContaining({
        lease,
        background: true,
        input,
        points: { redScore: 1, blueScore: 0 },
      }),
    );
  });

  it('creates missing sync state before a manual sync', async () => {
    const lease = {
      matchId: matchIdSchema.parse('ckm123456789012345678901'),
      osuMatchId: 1,
      leaseToken: 'token',
      status: 'active' as const,
    };
    const repository = {
      ensureSync: jest.fn(),
      claimOne: jest.fn().mockResolvedValue(lease),
    };
    const service = new MatchSyncService(repository as never, {} as never);
    jest.spyOn(service, 'syncOnce').mockResolvedValue(true);

    await expect(service.syncMatchOnce(lease.matchId)).resolves.toBe(true);
    expect(repository.ensureSync).toHaveBeenCalledWith(lease.matchId);
  });

  it('calculates red and blue team points', async () => {
    const lease = {
      matchId: matchIdSchema.parse('ckm123456789012345678901'),
      osuMatchId: 1,
      leaseToken: 'token',
      status: 'active' as const,
    };
    const input = {
      kind: 'team' as const,
      allowedBeatmapIds: new Set([10]),
    };
    const repository = {
      loadInput: jest.fn().mockResolvedValue(input),
      applySuccess: jest.fn().mockResolvedValue(true),
      applyFailure: jest.fn(),
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
              { userId: 1, score: 2_000, team: 'red' },
              { userId: 2, score: 1_000, team: 'blue' },
            ],
          },
        ],
      }),
    };

    await new MatchSyncService(repository as never, client as never).syncOnce(
      lease,
      true,
    );

    expect(repository.applySuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        input,
        points: { redScore: 1, blueScore: 0 },
      }),
    );
  });

  it('extracts qualification attempts instead of match points', async () => {
    const lease = {
      matchId: matchIdSchema.parse('ckm123456789012345678901'),
      osuMatchId: 1,
      leaseToken: 'token',
      status: 'active' as const,
    };
    const input = {
      kind: 'qualification' as const,
      allowedBeatmapIds: new Set([10]),
    };
    const repository = {
      loadInput: jest.fn().mockResolvedValue(input),
      applySuccess: jest.fn().mockResolvedValue(true),
      applyFailure: jest.fn(),
    };
    const snapshot = {
      closedAt: null,
      games: [
        {
          id: 4,
          beatmapId: 10,
          endedAt: new Date(),
          scores: [{ userId: 7, score: 950_000, team: null }],
        },
      ],
    };
    const client = { get: jest.fn().mockResolvedValue(snapshot) };

    await new MatchSyncService(repository as never, client as never).syncOnce(
      lease,
      true,
    );

    expect(repository.applySuccess).toHaveBeenCalledWith({
      lease,
      input,
      attempts: [
        { osuGameId: 4, osuBeatmapId: 10, osuUserId: 7, score: 950_000 },
      ],
      closedAt: null,
      background: true,
    });
  });
});
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(),
  init: jest.fn(() => jest.fn()),
}));
