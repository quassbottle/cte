import { MatchHistoryService } from './match-history.service';

describe('MatchHistoryService', () => {
  const tournamentId = 'ckt123456789012345678901' as never;
  const matchId = 'ckm123456789012345678901' as never;
  const score = (
    userName: string,
    team: 'red' | 'blue' | null,
    value: number,
  ) => ({
    osuUserId: value,
    userId: userName,
    userName,
    team,
    score: value,
    mods: [],
    maxCombo: 500,
    accuracy: 0.99,
    rank: 'S',
    great: 300,
    ok: 1,
    miss: 0,
  });

  const db = (result: unknown[]) => ({
    select: jest.fn(() => {
      const query = {
        from: jest.fn(() => query),
        innerJoin: jest.fn(() => query),
        leftJoin: jest.fn(() => query),
        where: jest.fn(() => query),
        orderBy: jest.fn(() => query),
        limit: jest.fn(() => Promise.resolve(result)),
        then: (
          resolve: (value: unknown[]) => unknown,
          reject: (reason: unknown) => unknown,
        ) => Promise.resolve(result).then(resolve, reject),
      };
      return query;
    }),
  });

  it('returns games in room order and highlights each map winner', async () => {
    const database = db([
      {
        name: 'Final 1',
        osuRoomId: 'room',
        redTeamId: 'red-team',
        blueTeamId: 'blue-team',
      },
    ]);
    const roomHistory = {
      get: jest.fn().mockResolvedValue({
        osuMatchId: 123,
        status: 'completed',
        lastSyncedAt: new Date('2026-07-28T10:00:00.000Z'),
        games: [
          {
            gameId: 10,
            beatmapId: 20,
            scores: [
              {
                osuUserId: 30,
                userId: 'user',
                userName: 'Player',
                team: 'red',
                score: 999_000,
                mods: ['NF'],
                maxCombo: 500,
                accuracy: 0.99,
                rank: 'S',
                great: 300,
                ok: 1,
                miss: 0,
              },
            ],
          },
          {
            gameId: 11,
            beatmapId: 21,
            scores: [
              {
                osuUserId: 31,
                userId: 'opponent',
                userName: 'Opponent',
                team: 'blue',
                score: 900_000,
                mods: [],
                maxCombo: 450,
                accuracy: 0.95,
                rank: 'A',
                great: 290,
                ok: 10,
                miss: 1,
              },
            ],
          },
        ],
      }),
    };
    const results = {
      get: jest.fn().mockResolvedValue({ redScore: 2, blueScore: 1 }),
    };

    const history = await new MatchHistoryService(
      database as never,
      roomHistory as never,
      results as never,
    ).get(tournamentId, matchId);

    expect(history).toEqual({
      title: 'Final 1',
      mpUrl: 'https://osu.ppy.sh/community/matches/123',
      syncStatus: 'completed',
      lastSyncedAt: '2026-07-28T10:00:00.000Z',
      winner: 'red',
      games: [
        {
          gameId: 10,
          beatmapId: 20,
          scores: [
            expect.objectContaining({
              osuUserId: 30,
              userId: 'user',
              competitorId: 'red-team',
              userName: 'Player',
              team: 'red',
              highlighted: true,
            }),
          ],
        },
        {
          gameId: 11,
          beatmapId: 21,
          scores: [
            expect.objectContaining({
              osuUserId: 31,
              userId: 'opponent',
              competitorId: 'blue-team',
              team: 'blue',
              highlighted: true,
            }),
          ],
        },
      ],
    });
  });

  it('groups teams by total and sorts players within each team', async () => {
    const database = db([
      {
        name: 'Final 1',
        osuRoomId: 'room',
        redTeamId: 'red-team',
        blueTeamId: 'blue-team',
      },
    ]);
    const roomHistory = {
      get: jest.fn().mockResolvedValue({
        osuMatchId: 123,
        status: 'completed',
        lastSyncedAt: new Date('2026-07-28T10:00:00.000Z'),
        games: [
          {
            gameId: 10,
            beatmapId: 20,
            scores: [
              score('Blue high', 'blue', 900),
              score('Red low', 'red', 400),
              score('Blue low', 'blue', 100),
              score('Red high', 'red', 700),
            ],
          },
        ],
      }),
    };
    const results = {
      get: jest.fn().mockResolvedValue({ redScore: 0, blueScore: 1 }),
    };

    const history = await new MatchHistoryService(
      database as never,
      roomHistory as never,
      results as never,
    ).get(tournamentId, matchId);

    expect(history.winner).toBe('blue');
    expect(
      history.games[0].scores.map(({ userName, highlighted }) => ({
        userName,
        highlighted,
      })),
    ).toEqual([
      { userName: 'Red high', highlighted: true },
      { userName: 'Red low', highlighted: true },
      { userName: 'Blue high', highlighted: false },
      { userName: 'Blue low', highlighted: false },
    ]);
  });

  it('sorts solo scores and highlights every tied leader', async () => {
    const database = db([
      {
        name: 'Solo final',
        osuRoomId: 'room',
        redTeamId: null,
        blueTeamId: null,
      },
    ]);
    const roomHistory = {
      get: jest.fn().mockResolvedValue({
        osuMatchId: 123,
        status: 'completed',
        lastSyncedAt: new Date('2026-07-28T10:00:00.000Z'),
        games: [
          {
            gameId: 10,
            beatmapId: 20,
            scores: [
              score('Low', null, 100),
              score('High B', null, 900),
              score('High A', null, 900),
            ],
          },
        ],
      }),
    };
    const results = {
      get: jest.fn().mockResolvedValue({ redScore: 1, blueScore: 1 }),
    };

    const history = await new MatchHistoryService(
      database as never,
      roomHistory as never,
      results as never,
    ).get(tournamentId, matchId);

    expect(
      history.games[0].scores.map(({ score, highlighted }) => ({
        score,
        highlighted,
      })),
    ).toEqual([
      { score: 900, highlighted: true },
      { score: 900, highlighted: true },
      { score: 100, highlighted: false },
    ]);
  });

  it('highlights both teams when their map totals are tied', async () => {
    const database = db([
      {
        name: 'Final 1',
        osuRoomId: 'room',
        redTeamId: 'red-team',
        blueTeamId: 'blue-team',
      },
    ]);
    const roomHistory = {
      get: jest.fn().mockResolvedValue({
        osuMatchId: 123,
        status: 'completed',
        lastSyncedAt: new Date('2026-07-28T10:00:00.000Z'),
        games: [
          {
            gameId: 10,
            beatmapId: 20,
            scores: [score('Blue', 'blue', 1_000), score('Red', 'red', 1_000)],
          },
        ],
      }),
    };
    const results = {
      get: jest.fn().mockResolvedValue({ redScore: 1, blueScore: 1 }),
    };

    const history = await new MatchHistoryService(
      database as never,
      roomHistory as never,
      results as never,
    ).get(tournamentId, matchId);

    expect(
      history.games[0].scores.map(({ highlighted }) => highlighted),
    ).toEqual([true, true]);
  });
});
