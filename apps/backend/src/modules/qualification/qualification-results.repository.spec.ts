import { QualificationResultsRepository } from './qualification-results.repository';

const containsValue = (
  value: unknown,
  expected: unknown,
  seen = new Set<object>(),
): boolean => {
  if (value === expected) return true;
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some((nested) =>
    containsValue(nested, expected, seen),
  );
};

describe('QualificationResultsRepository', () => {
  it('updates only the selected competitor seed', async () => {
    let condition: unknown;
    const set = jest.fn(() => ({
      where: jest.fn((value: unknown) => {
        condition = value;
        return { returning: jest.fn().mockResolvedValue([{}]) };
      }),
    }));
    const tx = {
      execute: jest.fn(),
      update: jest.fn(() => ({ set })),
    };
    const repository = new QualificationResultsRepository({
      transaction: (callback: (value: never) => unknown) =>
        callback(tx as never),
    } as never);

    await repository.setSeed({
      stageId: 'stage' as never,
      teamId: 'team' as never,
      seed: 3,
    });

    expect(set).toHaveBeenCalledWith(expect.objectContaining({ seed: 3 }));
    expect(containsValue(condition, 'stage')).toBe(true);
    expect(containsValue(condition, 'team')).toBe(true);
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
