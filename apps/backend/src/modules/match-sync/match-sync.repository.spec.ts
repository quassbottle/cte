import { MatchSyncRepository } from './match-sync.repository';

describe('MatchSyncRepository', () => {
  it('uses a different lease token for every claimed match', async () => {
    const update = jest.fn(() => ({ set: jest.fn(() => ({ where: jest.fn() })) }));
    const rows = [
      { matchId: 'a', osuMatchId: 1, status: 'active' },
      { matchId: 'b', osuMatchId: 2, status: 'active' },
    ];
    const forUpdate = jest.fn().mockResolvedValue(rows);
    const drizzle = {
      transaction: (callback: (tx: unknown) => unknown) => callback({
        select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: () => ({ for: forUpdate }) }) }) }) }),
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
});
