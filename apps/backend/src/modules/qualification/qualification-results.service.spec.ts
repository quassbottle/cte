import {
  QualificationResultsRepository,
  QualificationResultsService,
} from './qualification-results.service';

describe('QualificationResultsService', () => {
  it('does not replace results when assignments are incomplete', async () => {
    const repository = {
      recalculate: jest.fn(),
    };
    await new QualificationResultsService(repository as never).recalculate(
      'stage' as never,
    );
    expect(repository.recalculate).toHaveBeenCalledWith('stage');
  });

  it('keeps stale results retryable after a failed rebuild', async () => {
    const repository = {
      recalculate: jest.fn().mockRejectedValue(new Error('raw read failed')),
      isStale: jest.fn().mockResolvedValue(true),
    };
    const service = new QualificationResultsService(repository as never);
    await expect(service.recalculate('stage' as never)).rejects.toThrow(
      'raw read failed',
    );
    await expect(service.isStale('stage' as never)).resolves.toBe(true);
  });

  it('serializes invalidation with recalculation on the same stage lock', async () => {
    const calls: string[] = [];
    const tx = {
      execute: jest.fn(() => calls.push('lock')),
      delete: jest.fn(() => ({
        where: jest.fn(() => calls.push('delete')),
      })),
    };
    const db = {
      transaction: jest.fn((callback: (tx: never) => unknown) =>
        callback(tx as never),
      ),
    };

    await new QualificationResultsRepository(db as never).invalidate(
      'stage' as never,
    );

    expect(calls).toEqual(['lock', 'delete']);
  });

  it('loads and replaces results while holding the stage lock', async () => {
    const calls: string[] = [];
    const tx = {
      execute: jest.fn(() => calls.push('lock')),
      delete: jest.fn(() => ({
        where: jest.fn(() => calls.push('delete')),
      })),
      insert: jest.fn(() => ({
        values: jest.fn(() => calls.push('insert')),
      })),
    };
    const repository = new QualificationResultsRepository({
      transaction: (callback: (tx: never) => unknown) => callback(tx as never),
    } as never);
    jest.spyOn(repository, 'load').mockImplementation(async () => {
      calls.push('load');
      return {
        complete: true,
        isTeam: false,
        beatmapIds: ['map'],
        competitors: [{ id: 'user', tieBreakId: 1, userIds: ['user'] }],
        attempts: [],
      } as never;
    });

    await repository.recalculate('stage' as never);

    expect(calls).toEqual(['lock', 'load', 'delete', 'insert']);
  });
});
