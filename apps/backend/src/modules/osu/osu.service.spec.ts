import { OsuException, OsuExceptionCode } from 'lib/domain/osu/osu.exception';
import type { Schema } from 'lib/infrastructure/db';
import { OsuService as OsuApiService } from 'lib/infrastructure/osu/osu.service';
import { OsuBeatmapService } from './osu.service';

jest.mock('drizzle-orm', () => ({ eq: jest.fn() }));
jest.mock('lib/domain/beatmap/beatmap.id', () => ({ beatmapId: jest.fn() }));
jest.mock('lib/infrastructure/db', () => ({
  beatmaps: { osuBeatmapId: 'osuBeatmapId' },
}));

describe('OsuBeatmapService', () => {
  const findFirst = jest.fn();
  const drizzle = {
    query: {
      beatmaps: {
        findFirst,
      },
    },
  } as unknown as Schema;
  const getBeatmapDetails = jest.fn();
  const osuApiService = {
    getBeatmapDetails,
  } as unknown as OsuApiService;
  const service = new OsuBeatmapService(drizzle, osuApiService);

  beforeEach(() => {
    jest.clearAllMocks();
    findFirst.mockResolvedValue(undefined);
  });

  it('returns 404 instead of placeholder metadata when the beatmap does not exist', async () => {
    getBeatmapDetails.mockRejectedValue(new Error('404: Not Found'));

    await expect(
      service.getBeatmapMetadata({ beatmapId: 442231 }),
    ).rejects.toEqual(
      new OsuException(
        'Beatmap 442231 was not found',
        OsuExceptionCode.BEATMAP_NOT_FOUND,
      ),
    );
  });

  it('does not report an upstream failure as a missing beatmap', async () => {
    const upstreamError = new Error('AggregateError');
    getBeatmapDetails.mockRejectedValue(upstreamError);

    await expect(service.getBeatmapMetadata({ beatmapId: 442231 })).rejects.toBe(
      upstreamError,
    );
  });
});
