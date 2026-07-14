import { calculateQualificationSeeds } from './qualification-seeding';

describe('calculateQualificationSeeds', () => {
  it('ranks solo and team competitors from their best score on each map', () => {
    const result = calculateQualificationSeeds({
      beatmapIds: ['map-1', 'map-2', 'map-3'],
      competitors: [
        { id: 'A', tieBreakId: 'A', userIds: ['user-a'] },
        { id: 'B', tieBreakId: 'B', userIds: ['user-b'] },
        {
          id: 'C',
          tieBreakId: 'C',
          userIds: ['user-c1', 'user-c2'],
        },
      ],
      attempts: [
        { osuGameId: 1, beatmapId: 'map-1', userId: 'user-a', score: 100 },
        { osuGameId: 1, beatmapId: 'map-1', userId: 'user-b', score: 110 },
        { osuGameId: 1, beatmapId: 'map-1', userId: 'user-c1', score: 60 },
        { osuGameId: 1, beatmapId: 'map-1', userId: 'user-c2', score: 60 },
        { osuGameId: 2, beatmapId: 'map-1', userId: 'user-a', score: 120 },
        { osuGameId: 2, beatmapId: 'map-1', userId: 'user-b', score: 100 },
        { osuGameId: 2, beatmapId: 'map-1', userId: 'user-c1', score: 50 },
        { osuGameId: 2, beatmapId: 'map-1', userId: 'user-c2', score: 40 },
        { osuGameId: 3, beatmapId: 'map-2', userId: 'user-a', score: 100 },
        { osuGameId: 3, beatmapId: 'map-2', userId: 'user-b', score: 90 },
        { osuGameId: 3, beatmapId: 'map-2', userId: 'user-c1', score: 30 },
        { osuGameId: 3, beatmapId: 'map-2', userId: 'user-c2', score: 50 },
        { osuGameId: 4, beatmapId: 'map-3', userId: 'user-b', score: 50 },
        { osuGameId: 4, beatmapId: 'map-3', userId: 'user-c1', score: 35 },
        { osuGameId: 4, beatmapId: 'map-3', userId: 'user-c2', score: 25 },
      ],
    });
    const byId = new Map(result.map((seed) => [seed.competitorId, seed]));

    expect(
      result.map(({ competitorId, seed }) => ({ competitorId, seed })),
    ).toEqual([
      { competitorId: 'C', seed: 1 },
      { competitorId: 'A', seed: 2 },
      { competitorId: 'B', seed: 3 },
    ]);
    expect(byId.get('A')?.averagePlace).toBeCloseTo(5 / 3);
    expect(byId.get('C')?.averagePlace).toBe(byId.get('A')?.averagePlace);
    expect(byId.get('C')?.totalScore).toBeGreaterThan(
      byId.get('A')?.totalScore ?? 0,
    );
  });

  it.each([
    {
      name: 'numeric',
      competitors: [
        { id: 'ten', tieBreakId: 10, userIds: ['user-10'] },
        { id: 'two', tieBreakId: 2, userIds: ['user-2'] },
      ],
      expected: ['two', 'ten'],
    },
    {
      name: 'string',
      competitors: [
        { id: 'zed', tieBreakId: 'z', userIds: ['user-z'] },
        { id: 'alpha', tieBreakId: 'a', userIds: ['user-a'] },
      ],
      expected: ['alpha', 'zed'],
    },
  ])(
    'resolves exact equality by $name tieBreakId',
    ({ competitors, expected }) => {
      const result = calculateQualificationSeeds({
        beatmapIds: ['map-1'],
        competitors,
        attempts: [],
      });

      expect(result.map(({ competitorId }) => competitorId)).toEqual(expected);
      expect(result.map(({ seed }) => seed)).toEqual([1, 2]);
    },
  );
});
