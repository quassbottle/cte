jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { MatchSyncScheduler } from './match-sync.scheduler';

describe('MatchSyncScheduler', () => {
  const contains = (
    value: unknown,
    expected: unknown,
    seen = new Set(),
  ): boolean => {
    if (value === expected) return true;
    if (!value || typeof value !== 'object' || seen.has(value)) return false;
    seen.add(value);
    return Object.values(value).some((child) =>
      contains(child, expected, seen),
    );
  };

  it('syncs only active rooms referenced by regular matches', async () => {
    const roomIds = jest.fn((condition: unknown) => {
      void condition;
      return Promise.resolve([
        { roomId: 'regular-room', nextSyncAt: new Date(0) },
        { roomId: 'deferred-room', nextSyncAt: new Date(0) },
      ]);
    });
    const query = {
      innerJoin: (table: unknown, condition: unknown) => {
        void table;
        void condition;
        return query;
      },
      where: roomIds,
    };
    const db = {
      select: (columns: unknown) => {
        void columns;
        return {
          from: (table: unknown) => {
            void table;
            return query;
          },
        };
      },
    };
    const sync = { sync: jest.fn().mockResolvedValue(undefined) };
    const env = { get: jest.fn().mockReturnValue(1) };

    await new MatchSyncScheduler(
      db as never,
      sync as never,
      env as never,
    ).tick();

    expect(sync.sync).toHaveBeenCalledWith('regular-room');
    expect(sync.sync).toHaveBeenCalledTimes(1);
    expect(roomIds).toHaveBeenCalledTimes(1);
    expect(contains(roomIds.mock.calls[0][0], 'regular')).toBe(true);
    expect(contains(roomIds.mock.calls[0][0], 'active')).toBe(true);
  });
});
