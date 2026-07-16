jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { QualificationSyncScheduler } from './qualification-sync.scheduler';

describe('QualificationSyncScheduler', () => {
  it('syncs each room and recalculates a complete stale stage once', async () => {
    const repository = {
      activeRoomsByStage: jest.fn().mockResolvedValue([
        { stageId: 'stage', roomId: 'room-1' },
        { stageId: 'stage', roomId: 'room-2' },
      ]),
    };
    const sync = { sync: jest.fn() };
    const results = {
      isStale: jest.fn().mockResolvedValue(true),
      recalculate: jest.fn(),
    };
    const scheduler = new QualificationSyncScheduler(
      repository as never,
      sync as never,
      results as never,
    );

    await scheduler.sync();

    expect(sync.sync).toHaveBeenCalledTimes(2);
    expect(results.recalculate).toHaveBeenCalledTimes(1);
  });
});
