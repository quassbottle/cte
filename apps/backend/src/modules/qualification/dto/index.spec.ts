jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
  isCuid: jest.fn(() => true),
}));

import {
  qualificationLobbyDtoSchema,
  qualificationLobbyHistoryDtoSchema,
  qualificationStatisticsDtoSchema,
  qualificationStatisticsQuerySchema,
} from '.';

describe('qualificationLobbyDtoSchema', () => {
  it('keeps synchronized player score details out of the lobby summary', () => {
    const attempt = {
      beatmapId: 1,
      gameId: 2,
      osuUserId: 3,
      userId: null,
      userName: 'Player',
      score: 961684,
      mods: ['HD', 'HR'],
      maxCombo: 1457,
      accuracy: 0.9872,
      rank: 'A',
      great: 1463,
      ok: 16,
      miss: 11,
      counted: true,
    };

    const lobby = qualificationLobbyDtoSchema.parse({
      id: 'lobby',
      stageId: 'stage',
      number: 1,
      referee: {
        id: 'referee',
        osuId: 4,
        osuUsername: 'Referee',
        avatarUrl: 'https://a.ppy.sh/4',
        role: 'referee',
      },
      startsAt: '2026-07-19T10:00:00.000Z',
      endsAt: '2026-07-19T12:00:00.000Z',
      players: [],
      teams: [],
      seatCount: 0,
      syncStatus: 'completed',
      lastSyncedAt: null,
      attempts: [attempt],
      standings: [
        {
          competitorId: 'team',
          beatmapId: 1,
          gameId: 2,
          score: 961684,
          place: 1,
        },
      ],
    });

    expect(lobby).not.toHaveProperty('attempts');
    expect(lobby).not.toHaveProperty('standings');
    expect(lobby.referee.avatarUrl).toBe('https://a.ppy.sh/4');

    expect(
      qualificationLobbyHistoryDtoSchema.parse({
        lastSyncedAt: null,
        attempts: [attempt],
        standings: [
          {
            competitorId: 'team',
            beatmapId: 1,
            gameId: 2,
            score: 961684,
            place: 1,
          },
        ],
      }).attempts[0],
    ).toEqual(attempt);
  });

  it.each(['mods', 'maxCombo', 'accuracy', 'rank'] as const)(
    'rejects a synchronized score without %s',
    (field) => {
      expect(() =>
        qualificationLobbyHistoryDtoSchema.shape.attempts.element.parse({
          beatmapId: 1,
          gameId: 2,
          osuUserId: 3,
          userId: null,
          userName: 'Player',
          score: 961684,
          mods: [],
          maxCombo: 1457,
          accuracy: 0.9872,
          rank: 'A',
          great: null,
          ok: null,
          miss: null,
          counted: false,
          [field]: null,
        }),
      ).toThrow();
    },
  );

  it('parses qualification statistics', () => {
    expect(
      qualificationStatisticsDtoSchema.parse({
        maps: [
          {
            osuBeatmapId: 11,
            artist: 'Artist 1',
            title: 'Title 1',
            difficultyName: 'Difficulty 1',
            coverUrl: 'https://assets.ppy.sh/beatmaps/1/covers/cover@2x.jpg',
            mod: 'NM',
            index: 1,
          },
          {
            osuBeatmapId: 22,
            artist: 'Artist 2',
            title: 'Title 2',
            difficultyName: 'Difficulty 2',
            coverUrl: 'https://assets.ppy.sh/beatmaps/2/covers/cover@2x.jpg',
            mod: 'HD',
            index: 1,
          },
        ],
        competitors: [
          {
            id: 'team-a',
            name: 'Team A',
            seed: 1,
            maps: [
              { osuBeatmapId: 11, gameId: 101, score: 1_900_000, place: 1 },
              { osuBeatmapId: 22, gameId: null, score: 0, place: 2 },
            ],
          },
        ],
      }),
    ).toEqual({
      maps: [
        {
          osuBeatmapId: 11,
          artist: 'Artist 1',
          title: 'Title 1',
          difficultyName: 'Difficulty 1',
          coverUrl: 'https://assets.ppy.sh/beatmaps/1/covers/cover@2x.jpg',
          mod: 'NM',
          index: 1,
        },
        {
          osuBeatmapId: 22,
          artist: 'Artist 2',
          title: 'Title 2',
          difficultyName: 'Difficulty 2',
          coverUrl: 'https://assets.ppy.sh/beatmaps/2/covers/cover@2x.jpg',
          mod: 'HD',
          index: 1,
        },
      ],
      competitors: [
        {
          id: 'team-a',
          name: 'Team A',
          seed: 1,
          maps: [
            { osuBeatmapId: 11, gameId: 101, score: 1_900_000, place: 1 },
            { osuBeatmapId: 22, gameId: null, score: 0, place: 2 },
          ],
        },
      ],
    });
  });

  it('parses qualification statistics sorting', () => {
    expect(qualificationStatisticsQuerySchema.parse({})).toEqual({
      sortDirection: 'asc',
    });
    expect(
      qualificationStatisticsQuerySchema.parse({
        sortBeatmapId: '11',
        sortDirection: 'desc',
      }),
    ).toEqual({ sortBeatmapId: 11, sortDirection: 'desc' });

    expect(() =>
      qualificationStatisticsQuerySchema.parse({ sortDirection: 'sideways' }),
    ).toThrow();
  });
});
