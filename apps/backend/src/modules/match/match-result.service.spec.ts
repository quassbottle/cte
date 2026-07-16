import { MatchResultService } from './match-result.service';

describe('MatchResultService', () => {
  const matchId = 'ckm123456789012345678901' as never;

  const service = (input: {
    matches?: Record<string, unknown>[];
    players?: {
      matchId: string;
      userId: string;
      osuId: number;
      osuUsername: string;
    }[];
    beatmaps?: { osuBeatmapId: number }[];
    games?: { osuGameId: number; osuBeatmapId: number; endedAt: Date | null }[];
    scores?: {
      osuGameId: number;
      osuUserId: number;
      score: number;
      team: 'red' | 'blue' | null;
    }[];
  }) => {
    const rows = [
      input.matches ?? [],
      input.players ?? [],
      (input.beatmaps ?? []).map((row) => ({ matchId, ...row })),
      (input.games ?? []).map((row) => ({ roomId: 'room', ...row })),
      (input.scores ?? []).map((row) => ({ roomId: 'room', ...row })),
    ];
    const db = {
      select: jest.fn(() => ({
        from: jest.fn(() => {
          const query = {
            innerJoin: jest.fn(() => query),
            leftJoin: jest.fn(() => query),
            where: jest.fn().mockResolvedValue(rows.shift()),
          };
          return query;
        }),
      })),
    };
    return new MatchResultService(db as never);
  };

  it('derives team points from raw scores on allowed mappool beatmaps', async () => {
    const result = await service({
      matches: [
        {
          matchId,
          osuRoomId: 'room',
          redTeamId: 'red',
          blueTeamId: 'blue',
          status: 'active',
          lastSyncedAt: new Date(),
        },
      ],
      beatmaps: [{ osuBeatmapId: 10 }],
      games: [{ osuGameId: 1, osuBeatmapId: 10, endedAt: new Date() }],
      scores: [
        { osuGameId: 1, osuUserId: 1, score: 100, team: 'red' },
        { osuGameId: 1, osuUserId: 2, score: 90, team: 'blue' },
      ],
    }).get(matchId);

    expect(result).toMatchObject({ redScore: 1, blueScore: 0 });
  });

  it('maps solo osu user ids to the two scheduled participants', async () => {
    const result = await service({
      matches: [
        {
          matchId,
          osuRoomId: 'room',
          redTeamId: null,
          blueTeamId: null,
          status: 'completed',
          lastSyncedAt: new Date(),
        },
      ],
      players: [
        { matchId, userId: 'first', osuId: 11, osuUsername: 'First' },
        {
          matchId,
          userId: 'second',
          osuId: 22,
          osuUsername: 'Second',
        },
      ],
      beatmaps: [{ osuBeatmapId: 10 }],
      games: [{ osuGameId: 1, osuBeatmapId: 10, endedAt: new Date() }],
      scores: [
        { osuGameId: 1, osuUserId: 11, score: 100, team: null },
        { osuGameId: 1, osuUserId: 22, score: 90, team: null },
      ],
    }).get(matchId);

    expect(result.players).toEqual([
      { userId: 'first', score: 1, isWinner: true },
      { userId: 'second', score: 0, isWinner: false },
    ]);
  });

  it('keeps scheduled solo order when database rows are reversed', async () => {
    const result = await service({
      matches: [
        {
          matchId,
          osuRoomId: 'room',
          redTeamId: null,
          blueTeamId: null,
          status: 'completed',
          lastSyncedAt: new Date(),
        },
      ],
      players: [
        {
          matchId,
          userId: 'second',
          osuId: 22,
          osuUsername: 'Second',
        },
        { matchId, userId: 'first', osuId: 11, osuUsername: 'First' },
      ],
      beatmaps: [{ osuBeatmapId: 10 }],
      games: [{ osuGameId: 1, osuBeatmapId: 10, endedAt: new Date() }],
      scores: [
        { osuGameId: 1, osuUserId: 11, score: 100, team: null },
        { osuGameId: 1, osuUserId: 22, score: 90, team: null },
      ],
    }).get(matchId);

    expect(result.players[0]).toMatchObject({
      userId: 'first',
      score: 1,
      isWinner: true,
    });
  });

  it('returns a pending result without synchronized room data', async () => {
    await expect(
      service({ matches: [{ matchId, osuRoomId: null }] }).get(matchId),
    ).resolves.toEqual({
      syncStatus: null,
      lastSyncedAt: null,
      redScore: null,
      blueScore: null,
      players: [],
    });
  });
});
