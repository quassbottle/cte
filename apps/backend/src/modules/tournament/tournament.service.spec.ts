jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { TournamentService } from './tournament.service';

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

describe('TournamentService', () => {
  it('filters tournaments by mode and orders them by nearest start date', async () => {
    let call: Record<string, unknown> = {};
    const findMany = jest.fn((params: Record<string, unknown>) => {
      call = params;
      return Promise.resolve([]);
    });
    const drizzle = {
      query: {
        tournaments: {
          findMany,
        },
      },
    };
    const service = new TournamentService(drizzle as never);

    await service.findMany({
      limit: 20,
      offset: 0,
      mode: 'taiko',
      status: 'active',
    });

    expect(call.limit).toBe(20);
    expect(call.offset).toBe(0);
    expect(call.orderBy).toBeDefined();
    expect(call.where).toBeDefined();
  });

  it('archives tournaments by setting archivedAt', async () => {
    const archivedAt = new Date('2026-01-01T00:00:00.000Z');
    const returning = jest.fn().mockResolvedValue([{ id: 'tournament-1' }]);
    const where = jest.fn(() => ({ returning }));
    const set = jest.fn(() => ({ where }));
    const update = jest.fn(() => ({ set }));
    const drizzle = { update };
    const service = new TournamentService(drizzle as never);

    await service.archive({ id: 'tournament-1' as never, archivedAt });

    expect(update).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith({ archivedAt });
  });

  it('rejects updates to archived tournaments', async () => {
    const service = new TournamentService({} as never);
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'tournament-1',
      archivedAt: new Date('2026-01-01T00:00:00.000Z'),
      startsAt: new Date('2026-01-02T00:00:00.000Z'),
      endsAt: new Date('2026-01-03T00:00:00.000Z'),
    } as never);

    await expect(
      service.update({
        id: 'tournament-1' as never,
        data: { name: 'New name' },
      }),
    ).rejects.toThrow('Archived tournaments cannot be changed');
  });

  it('adds the participant search text to the tournament-scoped query', async () => {
    let condition: unknown;
    const offset = jest.fn().mockResolvedValue([]);
    const limit = jest.fn(() => ({ offset }));
    const where = jest.fn((value: unknown) => {
      condition = value;
      return { limit };
    });
    const innerJoin = jest.fn(() => ({ where }));
    const from = jest.fn(() => ({ innerJoin }));
    const service = new TournamentService({
      select: jest.fn(() => ({ from })),
    } as never);
    jest
      .spyOn(service, 'getById')
      .mockResolvedValue({ isTeam: false } as never);

    await service.getParticipants({
      id: 'ckm123456789012345678901' as never,
      limit: 20,
      offset: 0,
      query: 'player',
    } as never);

    expect(containsValue(condition, '%player%')).toBe(true);
  });

  it('searches tournament teams by name', async () => {
    const rows = [{ id: 'ckm123456789012345678902', name: 'Red Dragons' }];
    const offset = jest.fn().mockResolvedValue(rows);
    const limit = jest.fn(() => ({ offset }));
    const orderBy = jest.fn(() => ({ limit }));
    const where = jest.fn(() => ({ orderBy }));
    const from = jest.fn(() => ({ where }));
    const service = new TournamentService({
      select: jest.fn(() => ({ from })),
    } as never);
    jest.spyOn(service, 'getById').mockResolvedValue({ isTeam: true } as never);

    await expect(
      service.searchTeams({
        id: 'ckm123456789012345678901' as never,
        query: 'red',
        limit: 20,
        offset: 0,
      }),
    ).resolves.toEqual(rows);
  });

  it('does not search teams for a solo tournament', async () => {
    const select = jest.fn();
    const service = new TournamentService({ select } as never);
    jest
      .spyOn(service, 'getById')
      .mockResolvedValue({ isTeam: false } as never);

    await expect(
      service.searchTeams({
        id: 'ckm123456789012345678901' as never,
        query: '',
        limit: 20,
        offset: 0,
      }),
    ).resolves.toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });
});
