jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { UserId } from 'lib/domain/user/user.id';
import {
  ScheduleMatchUpsertInput,
  scheduleMatchUpsertDtoSchema,
  stageScheduleDtoSchema,
} from './dto';
import { MatchService } from './match.service';

describe('qualification schedule DTO', () => {
  it('exposes the stage type', () => {
    expect(
      stageScheduleDtoSchema.parse({
        id: 'ckm123456789012345678904',
        name: 'Qualifier',
        type: 'qualification',
        startsAt: '2026-07-13T12:00:00.000Z',
        endsAt: '2026-07-13T13:00:00.000Z',
        matches: [],
      }),
    ).toMatchObject({ type: 'qualification' });
  });
});

describe('MatchService qualification lobbies', () => {
  const tournamentId = 'ckm123456789012345678901' as TournamentId;
  const playerId = 'ckm123456789012345678902' as UserId;
  const qualificationData = (overrides: Record<string, unknown>) => ({
    ...scheduleMatchUpsertDtoSchema.parse({
      name: 'Qualifier lobby',
      stageId: 'ckm123456789012345678904',
      startsAt: '2026-07-13T12:00:00.000Z',
      endsAt: '2026-07-13T13:00:00.000Z',
      mpUrl: 'https://osu.ppy.sh/community/matches/123',
      ...overrides,
    }),
    creatorId: playerId,
  });

  const createService = (isTeam: boolean) => {
    const select = jest
      .fn()
      .mockImplementationOnce(() => ({
        from: jest.fn(() => ({
          innerJoin: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue([{ id: 'match-id' }]),
            })),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: jest.fn(() => ({
          where: jest.fn().mockResolvedValue([{ userId: playerId }]),
        })),
      }));
    const drizzle = {
      query: {
        stages: {
          findFirst: jest.fn().mockResolvedValue({ type: 'qualification' }),
        },
        tournaments: {
          findFirst: jest.fn().mockResolvedValue({ isTeam }),
        },
      },
      select,
    };

    return new MatchService(
      drizzle as never,
      {
        getState: jest.fn().mockResolvedValue(null),
      } as never,
    );
  };

  it('rejects regular match creation on qualification stages', async () => {
    await expect(
      createService(false).createScheduleMatch({
        tournamentId,
        data: qualificationData({}),
      }),
    ).rejects.toThrow(
      'Regular matches are unavailable on qualification stages',
    );
  });
});

describe('MatchService room references', () => {
  it('attaches the room returned for an mp URL', async () => {
    const values = jest.fn(() => ({
      returning: jest.fn().mockResolvedValue([{ id: 'match-id' }]),
    }));
    const tx = {
      insert: jest.fn(() => ({ values })),
      delete: jest.fn(() => ({ where: jest.fn() })),
    };
    const db = {
      query: {
        stages: { findFirst: jest.fn().mockResolvedValue({ type: 'regular' }) },
        tournaments: {
          findFirst: jest.fn().mockResolvedValue({ isTeam: false }),
        },
      },
      select: jest.fn(() => ({
        from: jest.fn(() => ({ where: jest.fn().mockResolvedValue([]) })),
      })),
      transaction: jest.fn((callback) => callback(tx)),
    };
    const sync = { ensureRoom: jest.fn().mockResolvedValue('room-id') };
    const service = new MatchService(db as never, sync as never);

    await service.createScheduleMatch({
      tournamentId: 'ckm123456789012345678901' as TournamentId,
      data: {
        ...scheduleMatchUpsertDtoSchema.parse({
          name: 'Final',
          stageId: 'ckm123456789012345678904',
          startsAt: '2026-07-13T12:00:00.000Z',
          endsAt: '2026-07-13T13:00:00.000Z',
          mpUrl: 'https://osu.ppy.sh/community/matches/123',
        }),
        creatorId: 'ckm123456789012345678902' as UserId,
      },
    });

    expect(sync.ensureRoom).toHaveBeenCalledWith(
      'https://osu.ppy.sh/community/matches/123',
    );
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ osuRoomId: 'room-id' }),
    );
  });

  const updateService = (currentRoomId: string | null) => {
    const returning = jest.fn().mockResolvedValue([{ id: 'match-id' }]);
    const set = jest.fn(() => ({ where: jest.fn(() => ({ returning })) }));
    const tx = {
      update: jest.fn(() => ({ set })),
      delete: jest.fn(() => ({ where: jest.fn() })),
      insert: jest.fn(() => ({ values: jest.fn() })),
    };
    const db = {
      query: {
        stages: { findFirst: jest.fn().mockResolvedValue({ type: 'regular' }) },
        tournaments: {
          findFirst: jest.fn().mockResolvedValue({ isTeam: false }),
        },
        matches: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'match-id',
            osuRoomId: currentRoomId,
          }),
        },
      },
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          innerJoin: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue([{ id: 'match-id' }]),
            })),
          })),
        })),
      })),
      transaction: jest.fn((callback) => callback(tx)),
    };
    const sync = {
      ensureRoom: jest.fn().mockResolvedValue('new-room'),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    return { service: new MatchService(db as never, sync as never), sync, set };
  };

  const updateData = (mpUrl: string | null) =>
    scheduleMatchUpsertDtoSchema.parse({
      name: 'Final',
      stageId: 'ckm123456789012345678904',
      startsAt: '2026-07-13T12:00:00.000Z',
      endsAt: '2026-07-13T13:00:00.000Z',
      mpUrl,
    });

  it('keeps the room active when the mp URL is unchanged', async () => {
    const { service, sync } = updateService('new-room');
    await service.updateScheduleMatch({
      tournamentId: 'ckm123456789012345678901' as TournamentId,
      matchId: 'ckm123456789012345678907' as never,
      data: updateData('https://osu.ppy.sh/community/matches/123'),
    });
    expect(sync.stop).not.toHaveBeenCalled();
  });

  it('stops the old room when the mp URL changes', async () => {
    const { service, sync } = updateService('old-room');
    await service.updateScheduleMatch({
      tournamentId: 'ckm123456789012345678901' as TournamentId,
      matchId: 'ckm123456789012345678907' as never,
      data: updateData('https://osu.ppy.sh/community/matches/456'),
    });
    expect(sync.stop).toHaveBeenCalledWith('old-room');
  });

  it('stops the old room when the mp URL is removed', async () => {
    const { service, sync, set } = updateService('old-room');
    await service.updateScheduleMatch({
      tournamentId: 'ckm123456789012345678901' as TournamentId,
      matchId: 'ckm123456789012345678907' as never,
      data: updateData(null),
    });
    expect(sync.ensureRoom).not.toHaveBeenCalled();
    expect(sync.stop).toHaveBeenCalledWith('old-room');
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ osuRoomId: null }),
    );
  });
});

describe('MatchService schedule competitors', () => {
  const tournamentId = 'ckm123456789012345678901' as TournamentId;
  const registeredPlayerId = 'ckm123456789012345678902' as UserId;
  const foreignPlayerId = 'ckm123456789012345678903' as UserId;
  const data = scheduleMatchUpsertDtoSchema.parse({
    name: 'Final',
    stageId: 'ckm123456789012345678904',
    startsAt: '2026-07-13T12:00:00.000Z',
    endsAt: '2026-07-13T13:00:00.000Z',
    players: [{ userId: registeredPlayerId }, { userId: foreignPlayerId }],
  });

  const createService = (registeredIds: UserId[]) => {
    const drizzle = {
      query: {
        tournaments: {
          findFirst: jest.fn().mockResolvedValue({ isTeam: false }),
        },
      },
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest
            .fn()
            .mockResolvedValue(registeredIds.map((userId) => ({ userId }))),
        })),
      })),
    };

    return new MatchService(drizzle as never, {} as never);
  };

  const assertCompetitors = (
    service: MatchService,
    input: ScheduleMatchUpsertInput,
  ) =>
    (
      service as unknown as {
        assertMatchCompetitors(
          id: TournamentId,
          value: ScheduleMatchUpsertInput,
          stage: { type: 'regular' },
        ): Promise<void>;
      }
    ).assertMatchCompetitors(tournamentId, input, { type: 'regular' });

  it('rejects a solo player who is not registered in the tournament', async () => {
    await expect(
      assertCompetitors(createService([registeredPlayerId]), data),
    ).rejects.toThrow('Players must participate in the tournament');
  });

  it('accepts registered solo tournament players', async () => {
    await expect(
      assertCompetitors(
        createService([registeredPlayerId, foreignPlayerId]),
        data,
      ),
    ).resolves.toBeUndefined();
  });
});
