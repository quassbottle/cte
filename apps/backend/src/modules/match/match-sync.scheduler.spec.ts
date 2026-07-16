jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { MatchSyncScheduler } from './match-sync.scheduler';

describe('MatchSyncScheduler', () => {
  it('syncs only active rooms referenced by regular matches', async () => {
    const roomIds = jest.fn().mockResolvedValue([{ roomId: 'regular-room' }]);
    const query = {
      innerJoin: jest.fn(() => query),
      where: roomIds,
    };
    const db = {
      select: jest.fn(() => ({
        from: jest.fn(() => query),
      })),
    };
    const sync = { sync: jest.fn().mockResolvedValue(undefined) };

    await new MatchSyncScheduler(db as never, sync as never).tick();

    expect(sync.sync).toHaveBeenCalledWith('regular-room');
    expect(roomIds).toHaveBeenCalledTimes(1);
  });
});
