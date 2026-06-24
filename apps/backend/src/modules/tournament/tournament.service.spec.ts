jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { TournamentService } from './tournament.service';

describe('TournamentService', () => {
  it('filters tournaments by mode and orders them by nearest start date', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
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

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
        offset: 0,
        orderBy: expect.anything(),
        where: expect.anything(),
      }),
    );
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
});
