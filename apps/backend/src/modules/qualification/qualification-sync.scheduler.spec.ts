jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { QualificationSyncScheduler } from './qualification-sync.scheduler';

describe('QualificationSyncScheduler', () => {
  it('syncs each room and recalculates a complete stale stage once', async () => {
    const repository = {
      roomsByStage: jest.fn().mockResolvedValue([
        {
          stageId: 'stage',
          roomId: 'room-1',
          status: 'active',
          nextSyncAt: new Date(0),
        },
        {
          stageId: 'stage',
          roomId: 'room-2',
          status: 'active',
          nextSyncAt: new Date(0),
        },
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
      { get: jest.fn().mockReturnValue(1) } as never,
    );

    await scheduler.sync();

    expect(sync.sync).toHaveBeenCalledTimes(1);
    expect(results.recalculate).not.toHaveBeenCalled();
  });

  it('does not recalculate stages whose rooms are already closed', async () => {
    const repository = {
      roomsByStage: jest.fn().mockResolvedValue([
        {
          stageId: 'stage',
          roomId: 'room',
          status: 'completed',
          nextSyncAt: new Date(0),
        },
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
      { get: jest.fn().mockReturnValue(1) } as never,
    );

    await scheduler.sync();

    expect(sync.sync).not.toHaveBeenCalled();
    expect(results.isStale).not.toHaveBeenCalled();
    expect(results.recalculate).not.toHaveBeenCalled();
  });

  it('recalculates after successfully syncing the last due active room', async () => {
    const repository = {
      roomsByStage: jest.fn().mockResolvedValue([
        {
          stageId: 'stage',
          roomId: 'room',
          status: 'active',
          nextSyncAt: new Date(0),
        },
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
      { get: jest.fn().mockReturnValue(1) } as never,
    );

    await scheduler.sync();

    expect(sync.sync).toHaveBeenCalledWith('room');
    expect(results.recalculate).toHaveBeenCalledWith('stage');
  });
});
