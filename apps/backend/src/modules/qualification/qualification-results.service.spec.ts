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

  it('returns qualification statistics with map presentation and missing results', async () => {
    const repository = {
      findStageId: jest.fn().mockResolvedValue('stage'),
      load: jest.fn().mockResolvedValue({
        beatmaps: [
          {
            beatmapId: 'map-1',
            osuBeatmapId: 11,
            osuBeatmapsetId: 1,
            artist: 'Artist 1',
            title: 'Title 1',
            difficultyName: 'Difficulty 1',
            mod: 'NM',
            index: 1,
          },
          {
            beatmapId: 'map-2',
            osuBeatmapId: 22,
            osuBeatmapsetId: 2,
            artist: 'Artist 2',
            title: 'Title 2',
            difficultyName: 'Difficulty 2',
            mod: 'HD',
            index: 1,
          },
        ],
        beatmapIds: ['map-1', 'map-2'],
        attempts: [
          { osuGameId: 101, beatmapId: 'map-1', userId: 'a', score: 1_900_000 },
        ],
        competitors: [
          {
            id: 'team-a',
            name: 'Team A',
            seed: 3,
            tieBreakId: 'a',
            userIds: ['a'],
          },
        ],
      }),
    };

    const result = await new QualificationResultsService(
      repository as never,
    ).getStatistics('tournament' as never);

    expect(result).toEqual({
      maps: [
        expect.objectContaining({ osuBeatmapId: 11, mod: 'NM', index: 1 }),
        expect.objectContaining({ osuBeatmapId: 22, mod: 'HD', index: 1 }),
      ],
      competitors: [
        {
          id: 'team-a',
          name: 'Team A',
          seed: 3,
          maps: [
            { osuBeatmapId: 11, gameId: 101, score: 1_900_000, place: 1 },
            { osuBeatmapId: 22, gameId: null, score: 0, place: 1 },
          ],
        },
      ],
    });
  });

  it('sorts qualification statistics by score in both directions with missing scores as zero', async () => {
    const repository = {
      findStageId: jest.fn().mockResolvedValue('stage'),
      load: jest.fn().mockResolvedValue({
        beatmaps: [
          {
            beatmapId: 'map',
            osuBeatmapId: 11,
            osuBeatmapsetId: 1,
            artist: 'Artist',
            title: 'Title',
            difficultyName: 'Difficulty',
            mod: 'NM',
            index: 1,
          },
        ],
        beatmapIds: ['map'],
        attempts: [
          { osuGameId: 1, beatmapId: 'map', userId: 'a', score: 200 },
          { osuGameId: 2, beatmapId: 'map', userId: 'b', score: 100 },
        ],
        competitors: [
          { id: 'a', name: 'A', seed: 2, tieBreakId: 'a', userIds: ['a'] },
          { id: 'b', name: 'B', seed: 1, tieBreakId: 'b', userIds: ['b'] },
          {
            id: 'missing',
            name: 'Missing',
            seed: 3,
            tieBreakId: 'missing',
            userIds: ['missing'],
          },
        ],
      }),
    };
    const service = new QualificationResultsService(repository as never);

    await expect(
      service.getStatistics('tournament' as never),
    ).resolves.toMatchObject({
      competitors: [{ id: 'b' }, { id: 'a' }, { id: 'missing' }],
    });
    await expect(
      service.getStatistics('tournament' as never, {
        sortDirection: 'desc',
      }),
    ).resolves.toMatchObject({
      competitors: [{ id: 'missing' }, { id: 'a' }, { id: 'b' }],
    });
    await expect(
      service.getStatistics('tournament' as never, {
        sortBeatmapId: 11,
        sortDirection: 'asc',
      }),
    ).resolves.toMatchObject({
      competitors: [{ id: 'missing' }, { id: 'b' }, { id: 'a' }],
    });
    await expect(
      service.getStatistics('tournament' as never, {
        sortBeatmapId: 11,
        sortDirection: 'desc',
      }),
    ).resolves.toMatchObject({
      competitors: [{ id: 'a' }, { id: 'b' }, { id: 'missing' }],
    });
  });
});
