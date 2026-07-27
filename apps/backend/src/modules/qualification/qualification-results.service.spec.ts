import { QualificationResultsService } from './qualification-results.service';

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

  it('returns the counted game and per-map place with the osu beatmap id', async () => {
    const repository = {
      load: jest.fn().mockResolvedValue({
        beatmaps: [{ beatmapId: 'map', osuBeatmapId: 42 }],
        beatmapIds: ['map'],
        attempts: [
          { osuGameId: 1, beatmapId: 'map', userId: 'a', score: 100 },
          { osuGameId: 2, beatmapId: 'map', userId: 'a', score: 200 },
          { osuGameId: 3, beatmapId: 'map', userId: 'b', score: 150 },
        ],
        competitors: [
          { id: 'team-a', tieBreakId: 'a', userIds: ['a'] },
          { id: 'team-b', tieBreakId: 'b', userIds: ['b'] },
        ],
      }),
    };

    const result = await new QualificationResultsService(
      repository as never,
    ).getBreakdown('stage' as never);

    expect(result[0]).toMatchObject({
      competitorId: 'team-a',
      userIds: ['a'],
      maps: [
        {
          osuBeatmapId: 42,
          osuGameId: 2,
          score: 200,
          place: 1,
        },
      ],
    });
  });
});
