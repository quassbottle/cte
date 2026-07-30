jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
  isCuid: jest.fn(() => true),
}));

import { PgDialect } from 'drizzle-orm/pg-core';
import { StageStatisticsService } from './stage-statistics.service';

describe('StageStatisticsService', () => {
  it('returns every individual qualification attempt with the player team', async () => {
    const map = {
      osuBeatmapId: 11,
      osuBeatmapsetId: 22,
      artist: 'Artist',
      title: 'Title',
      difficultyName: 'Difficulty',
      mod: 'NM',
      index: 1,
    };
    const attempts = [
      {
        competitorId: 'user-1',
        osuBeatmapId: 11,
        gameId: 101,
        matchId: null,
        lobbyId: 'lobby-1',
        score: 900_000,
        place: 2,
      },
      {
        competitorId: 'user-1',
        osuBeatmapId: 11,
        gameId: 102,
        matchId: null,
        lobbyId: 'lobby-1',
        score: 950_000,
        place: 1,
      },
    ];
    const execute = jest
      .fn()
      .mockResolvedValueOnce({ rows: attempts })
      .mockResolvedValueOnce({
        rows: [
          { id: 'user-1', name: 'Player', osuId: 42, teamName: 'Japan' },
        ],
      });
    const select = jest
      .fn()
      .mockReturnValueOnce({
        from: () => ({ where: () => Promise.resolve([{ isTeam: true }]) }),
      })
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => ({ orderBy: () => Promise.resolve([map]) }),
            }),
          }),
        }),
      });
    const qualificationResults = {
      getStatisticsByStage: jest.fn(),
    };
    const service = new StageStatisticsService(
      { select, execute } as never,
      {
        getById: jest.fn().mockResolvedValue({ type: 'qualification' }),
      } as never,
      qualificationResults as never,
    );

    const result = await service.get('tournament' as never, 'stage' as never, {
      view: 'players',
      sortDirection: 'desc',
    });

    expect(qualificationResults.getStatisticsByStage).not.toHaveBeenCalled();
    expect(result.competitors).toEqual([
      {
        id: 'user-1',
        name: 'Player',
        avatarUrl: 'https://a.ppy.sh/42',
        teamName: 'Japan',
        maps: [
          {
            osuBeatmapId: 11,
            attempts: [
              {
                gameId: 101,
                matchId: null,
                lobbyId: 'lobby-1',
                score: 900_000,
                place: 2,
              },
              {
                gameId: 102,
                matchId: null,
                lobbyId: 'lobby-1',
                score: 950_000,
                place: 1,
              },
            ],
          },
        ],
      },
    ]);

    const attemptsSql = new PgDialect().sqlToQuery(
      execute.mock.calls[0][0],
    ).sql;
    expect(attemptsSql).toContain('qualification_lobbies');
    expect(attemptsSql).toContain('team_participants');
    expect(attemptsSql).toContain('rank() over');
  });
});
