import {
  matchOsuSync,
  matchParticipants,
  matches,
  qualificationAttempts,
} from 'lib/infrastructure/db';
import { MatchSyncRepository } from './match-sync.repository';

describe('MatchSyncRepository', () => {
  it('uses a different lease token for every claimed match', async () => {
    const update = jest.fn(() => ({
      set: jest.fn(() => ({ where: jest.fn() })),
    }));
    const rows = [
      { matchId: 'a', osuMatchId: 1, status: 'active' },
      { matchId: 'b', osuMatchId: 2, status: 'active' },
    ];
    const forUpdate = jest.fn().mockResolvedValue(rows);
    const drizzle = {
      transaction: (callback: (tx: unknown) => unknown) =>
        callback({
          select: () => ({
            from: () => ({
              where: () => ({
                orderBy: () => ({ limit: () => ({ for: forUpdate }) }),
              }),
            }),
          }),
          update,
        }),
    };
    const repository = new MatchSyncRepository(
      drizzle as never,
      { get: jest.fn(() => 60_000) } as never,
    );

    const leases = await repository.claimDue(2);

    expect(leases).toHaveLength(2);
    expect(new Set(leases.map((lease) => lease.leaseToken)).size).toBe(2);
  });

  it('loads qualification input without requiring participants', async () => {
    const select = jest
      .fn()
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({ limit: async () => [{ type: 'qualification' }] }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({ orderBy: async () => [] }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              innerJoin: () => ({
                where: async () => [{ osuBeatmapId: 101 }],
              }),
            }),
          }),
        }),
      });
    const repository = new MatchSyncRepository(
      { select } as never,
      {} as never,
    );

    await expect(repository.loadInput('match' as never)).resolves.toEqual({
      kind: 'qualification',
      allowedBeatmapIds: new Set([101]),
    });
  });

  it('upserts normalized qualification attempts without regular score writes', async () => {
    const conflict = jest.fn().mockResolvedValue(undefined);
    const values = jest.fn(() => ({ onConflictDoUpdate: conflict }));
    const insert = jest.fn(() => ({ values }));
    const update = jest.fn(() => ({
      set: () => ({ where: jest.fn().mockResolvedValue(undefined) }),
    }));
    const select = jest
      .fn()
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            for: () => ({ limit: async () => [{ matchId: 'match' }] }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [{ id: 'beatmap', osuBeatmapId: 101 }],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [{ id: 'known-user', osuId: 10 }],
        }),
      });
    const tx = { select, insert, update };
    const repository = new MatchSyncRepository(
      {
        transaction: (callback: (value: typeof tx) => unknown) => callback(tx),
      } as never,
      { get: jest.fn(() => 60_000) } as never,
    );

    await repository.applySuccess({
      lease: {
        matchId: 'match' as never,
        osuMatchId: 1,
        leaseToken: 'token',
        status: 'active',
      },
      input: { kind: 'qualification', allowedBeatmapIds: new Set([101]) },
      attempts: [
        { osuGameId: 1, osuBeatmapId: 101, osuUserId: 10, score: 900_000 },
        { osuGameId: 1, osuBeatmapId: 101, osuUserId: 20, score: 800_000 },
      ],
      closedAt: null,
      background: true,
    });

    expect(insert).toHaveBeenCalledWith(qualificationAttempts);
    expect(values).toHaveBeenCalledWith([
      {
        matchId: 'match',
        osuGameId: 1,
        beatmapId: 'beatmap',
        userId: 'known-user',
        score: 900_000,
      },
    ]);
    expect(conflict).toHaveBeenCalledWith(
      expect.objectContaining({
        target: [
          qualificationAttempts.matchId,
          qualificationAttempts.osuGameId,
          qualificationAttempts.userId,
        ],
      }),
    );
    expect(update).toHaveBeenCalledWith(matchOsuSync);
    expect(update).not.toHaveBeenCalledWith(matches);
    expect(update).not.toHaveBeenCalledWith(matchParticipants);
  });
});
