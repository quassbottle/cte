import { OsuMultiplayerHistoryService } from './osu-multiplayer-history.service';

describe('OsuMultiplayerHistoryService', () => {
  it('returns room metadata and groups detailed scores by ordered game', async () => {
    const rows = [
      [
        {
          osuMatchId: 123,
          status: 'completed',
          lastSyncedAt: new Date('2026-07-28T10:00:00.000Z'),
        },
      ],
      [
        {
          gameId: 10,
          beatmapId: 20,
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
        {
          gameId: 10,
          beatmapId: 20,
          osuUserId: 31,
          userId: null,
          userName: null,
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
    ];
    const db = {
      select: jest.fn(() => {
        const result = rows.shift() ?? [];
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
    };

    const history = await new OsuMultiplayerHistoryService(db as never).get(
      'room' as never,
    );

    expect(history).toEqual({
      osuMatchId: 123,
      status: 'completed',
      lastSyncedAt: new Date('2026-07-28T10:00:00.000Z'),
      games: [
        {
          gameId: 10,
          beatmapId: 20,
          scores: [
            expect.objectContaining({
              osuUserId: 30,
              userId: 'user',
              userName: 'Player',
              mods: ['NF'],
            }),
            expect.objectContaining({
              osuUserId: 31,
              userId: null,
              userName: null,
            }),
          ],
        },
      ],
    });
  });

  it('returns null for an unknown room', async () => {
    const db = {
      select: jest.fn(() => {
        const query = {
          from: jest.fn(() => query),
          where: jest.fn(() => query),
          limit: jest.fn().mockResolvedValue([]),
        };
        return query;
      }),
    };

    await expect(
      new OsuMultiplayerHistoryService(db as never).get('missing' as never),
    ).resolves.toBeNull();
  });
});
