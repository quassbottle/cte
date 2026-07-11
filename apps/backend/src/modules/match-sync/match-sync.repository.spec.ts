import { MatchSyncRepository } from './match-sync.repository';

describe('MatchSyncRepository', () => {
  it('uses a different lease token for every claimed match', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          { match_id: 'a', osu_match_id: 1, status: 'active' },
          { match_id: 'b', osu_match_id: 2, status: 'active' },
        ],
      })
      .mockResolvedValue({ rows: [] });
    const drizzle = {
      transaction: (callback: (tx: { execute: typeof execute }) => unknown) =>
        callback({ execute }),
      execute,
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
