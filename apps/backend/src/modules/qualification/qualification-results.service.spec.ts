import {
  QualificationResultsRepository,
  QualificationResultsService,
} from './qualification-results.service';

describe('QualificationResultsService', () => {
  it('does not replace results when assignments are incomplete', async () => {
    const repository = {
      load: jest.fn().mockResolvedValue({ complete: false }),
      replace: jest.fn(),
    };
    await new QualificationResultsService(repository as never).recalculate(
      'stage' as never,
    );
    expect(repository.replace).not.toHaveBeenCalled();
  });

  it('keeps stale results retryable after a failed rebuild', async () => {
    const repository = {
      load: jest.fn().mockRejectedValue(new Error('raw read failed')),
      replace: jest.fn(),
      isStale: jest.fn().mockResolvedValue(true),
    };
    const service = new QualificationResultsService(repository as never);
    await expect(service.recalculate('stage' as never)).rejects.toThrow(
      'raw read failed',
    );
    await expect(service.isStale('stage' as never)).resolves.toBe(true);
    expect(repository.replace).not.toHaveBeenCalled();
  });

  it('replaces one stage atomically', async () => {
    const calls: string[] = [];
    const tx = {
      delete: jest.fn(() => ({
        where: jest.fn(() => calls.push('delete')),
      })),
      insert: jest.fn(() => ({
        values: jest.fn(() => calls.push('insert')),
      })),
    };
    const db = {
      transaction: jest.fn((callback: (tx: never) => unknown) =>
        callback(tx as never),
      ),
    };
    await new QualificationResultsRepository(db as never).replace(
      'stage' as never,
      false,
      [
        {
          competitorId: 'user',
          seed: 1,
          averagePlace: 1,
          totalScore: 100,
        },
      ],
    );
    expect(calls).toEqual(['delete', 'insert']);
  });
});
