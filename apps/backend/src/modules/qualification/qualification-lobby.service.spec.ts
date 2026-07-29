jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { QualificationLobbyService } from './qualification-lobby.service';

describe('QualificationLobbyService', () => {
  const rows = (value: unknown) => {
    const builder = {
      from: jest.fn(() => builder),
      innerJoin: jest.fn(() => builder),
      leftJoin: jest.fn(() => builder),
      where: jest.fn().mockResolvedValue(value),
    };
    return builder;
  };

  it('does not load multiplayer score history for the lobby list', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(
          rows([
            {
              lobby: {
                id: 'lobby',
                stageId: 'stage',
                number: 1,
                startsAt: new Date('2026-07-28T10:00:00Z'),
                endsAt: new Date('2026-07-28T12:00:00Z'),
              },
              referee: { id: 'referee', osuId: 1, osuUsername: 'Referee' },
              room: { status: 'completed', lastSyncedAt: new Date(0) },
            },
          ]),
        )
        .mockReturnValueOnce(rows([]))
        .mockReturnValueOnce(rows([])),
    };
    const roomHistory = { get: jest.fn() };
    const service = new QualificationLobbyService(
      db as never,
      {} as never,
      {} as never,
      roomHistory as never,
      {} as never,
    );

    const [lobby] = await service.findByTournament('tournament' as never);

    expect(roomHistory.get).not.toHaveBeenCalled();
    expect(lobby).not.toHaveProperty('attempts');
    expect(lobby).toMatchObject({
      syncStatus: 'completed',
      lastSyncedAt: new Date(0).toISOString(),
    });
  });

  it('loads and enriches one scoped lobby history on demand', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(rows([{ id: 'team', name: 'Team' }]))
        .mockReturnValueOnce(rows([])),
    };
    const roomHistory = {
      get: jest.fn().mockResolvedValue({
        lastSyncedAt: new Date(0),
        games: [
          {
            gameId: 2,
            beatmapId: 1,
            scores: [{ userId: 'user', osuUserId: 3, score: 900_000 }],
          },
        ],
      }),
    };
    const results = {
      getBreakdown: jest.fn().mockResolvedValue([
        {
          competitorId: 'team',
          userIds: ['user'],
          maps: [
            {
              osuBeatmapId: 1,
              osuGameId: 2,
              score: 1_800_000,
              place: 3,
            },
          ],
        },
      ]),
    };
    const service = new QualificationLobbyService(
      db as never,
      {} as never,
      {} as never,
      roomHistory as never,
      results as never,
    );
    (service as unknown as { getScoped: jest.Mock }).getScoped = jest
      .fn()
      .mockResolvedValue({ id: 'lobby', stageId: 'stage', osuRoomId: 'room' });

    const history = await service.getHistory(
      'tournament' as never,
      'lobby' as never,
    );

    expect(history.attempts).toEqual([
      expect.objectContaining({
        beatmapId: 1,
        gameId: 2,
        competitorId: 'team',
        counted: true,
      }),
    ]);
    expect(history.standings).toEqual([
      expect.objectContaining({ competitorId: 'team', place: 3 }),
    ]);
  });

  it('stops the lobby room through the shared sync service', async () => {
    const syncService = { stop: jest.fn() };
    const service = new QualificationLobbyService(
      {} as never,
      {} as never,
      syncService as never,
      {} as never,
      {} as never,
    );
    (service as unknown as { getScoped: jest.Mock }).getScoped = jest
      .fn()
      .mockResolvedValue({ osuRoomId: 'room' });

    await service.stop({
      tournamentId: 'tournament' as never,
      lobbyId: 'lobby' as never,
    });

    expect(syncService.stop).toHaveBeenCalledWith('room');
  });

  it('rejects a non-captain team selection', async () => {
    const db = {
      query: {
        teams: {
          findFirst: jest.fn().mockResolvedValue({ captainId: 'captain' }),
        },
      },
    };
    const service = new QualificationLobbyService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    (service as unknown as { getScoped: jest.Mock }).getScoped = jest
      .fn()
      .mockResolvedValue({ stageId: 'stage' });

    await expect(
      service.joinTeam({
        tournamentId: 'tournament' as never,
        lobbyId: 'lobby' as never,
        teamId: 'team' as never,
        userId: 'not-captain' as never,
      }),
    ).rejects.toThrow('Only team captain');
  });
});
