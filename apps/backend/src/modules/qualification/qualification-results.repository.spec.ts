import { QualificationResultsRepository } from './qualification-results.repository';

describe('QualificationResultsRepository', () => {
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
    jest.spyOn(repository, 'load').mockImplementation(() => {
      calls.push('load');
      return Promise.resolve({
        complete: true,
        isTeam: false,
        beatmapIds: ['map'],
        competitors: [{ id: 'user', tieBreakId: 1, userIds: ['user'] }],
        attempts: [],
      } as never);
    });

    await repository.recalculate('stage' as never);

    expect(calls).toEqual(['lock', 'load', 'delete', 'insert']);
  });
});
