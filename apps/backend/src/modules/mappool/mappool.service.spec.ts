jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { MappoolExceptionCode } from 'lib/domain/mappool/mappool.exception';
import { MappoolId } from 'lib/domain/mappool/mappool.id';
import { MappoolService } from './mappool.service';

describe('MappoolService reorderBeatmaps', () => {
  const id = 'ckm123456789012345678901' as MappoolId;
  const stageId = 'ckm123456789012345678902';

  const createService = (currentIds = [10, 20, 30]) => {
    const where = jest
      .fn()
      .mockResolvedValue(currentIds.map((osuBeatmapId) => ({ osuBeatmapId })));
    const tx = {
      update: jest.fn(() => ({
        set: jest.fn(() => ({ where: jest.fn().mockResolvedValue(undefined) })),
      })),
    };
    const drizzle = {
      query: {
        mappools: {
          findFirst: jest.fn().mockResolvedValue({ id, stageId }),
        },
      },
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          innerJoin: jest.fn(() => ({ where })),
        })),
      })),
      transaction: jest.fn((run: (value: typeof tx) => unknown) => run(tx)),
    };
    const invalidate = jest.fn();

    return {
      service: new MappoolService(
        drizzle as never,
        {} as never,
        { invalidate } as never,
      ),
      drizzle,
      tx,
      invalidate,
    };
  };

  it('writes every requested position in one transaction', async () => {
    const { service, drizzle, tx, invalidate } = createService();

    await service.reorderBeatmaps({ id, osuBeatmapIds: [30, 10, 20] });

    expect(drizzle.transaction).toHaveBeenCalledTimes(1);
    expect(tx.update).toHaveBeenCalledTimes(3);
    expect(
      tx.update.mock.results.map(({ value }) => value.set.mock.calls[0][0]),
    ).toEqual([{ position: 1 }, { position: 2 }, { position: 3 }]);
    expect(invalidate).toHaveBeenCalledWith(stageId);
  });

  it.each([
    ['duplicates', [10, 10, 30]],
    ['missing maps', [10, 20]],
    ['foreign maps', [10, 20, 40]],
  ])('rejects %s without writing', async (_name, osuBeatmapIds) => {
    const { service, drizzle } = createService();

    const error = await service
      .reorderBeatmaps({ id, osuBeatmapIds })
      .catch((caught: { getResponse(): unknown }) => caught);

    expect((error as { getResponse(): unknown }).getResponse()).toMatchObject({
      errorCode: MappoolExceptionCode.MAPPOOL_BEATMAP_INVALID,
    });
    expect(drizzle.transaction).not.toHaveBeenCalled();
  });
});
