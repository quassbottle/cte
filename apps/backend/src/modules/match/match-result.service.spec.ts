import { MatchResultService } from './match-result.service';

describe('MatchResultService', () => {
  const matchId = 'ckm123456789012345678901' as never;

  const service = (input: {
    match?: Record<string, unknown>;
    players?: { userId: string; osuId: number }[];
    beatmaps?: { osuBeatmapId: number }[];
    games?: { osuGameId: number; osuBeatmapId: number; endedAt: Date | null }[];
    scores?: { osuGameId: number; osuUserId: number; score: number; team: 'red' | 'blue' | null }[];
  }) => {
    const rows = [
      input.players ?? [],
      input.beatmaps ?? [],
      input.games ?? [],
      input.scores ?? [],
    ];
    const db = {
      query: {
        matches: { findFirst: jest.fn().mockResolvedValue(input.match) },
        osuMultiplayerRooms: {
          findFirst: jest.fn().mockResolvedValue(
            (input.match?.room as Record<string, unknown> | undefined) ?? null,
          ),
        },
      },
      select: jest.fn(() => ({
        from: jest.fn(() => {
          const query = {
            innerJoin: jest.fn(() => query),
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
      match: { osuRoomId: 'room', redTeamId: 'red', blueTeamId: 'blue', room: { status: 'active', lastSyncedAt: new Date() } },
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
      match: { osuRoomId: 'room', redTeamId: null, blueTeamId: null, room: { status: 'completed', lastSyncedAt: new Date() } },
      players: [{ userId: 'first', osuId: 11 }, { userId: 'second', osuId: 22 }],
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

  it('returns a pending result without synchronized room data', async () => {
    await expect(service({ match: { osuRoomId: null } }).get(matchId)).resolves.toEqual({
      syncStatus: null,
      lastSyncedAt: null,
      redScore: null,
      blueScore: null,
      players: [],
    });
  });
});
