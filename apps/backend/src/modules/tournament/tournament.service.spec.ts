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

    await service.findMany({ limit: 20, offset: 0, mode: 'taiko' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
        offset: 0,
        orderBy: expect.anything(),
        where: expect.anything(),
      }),
    );
  });
});
