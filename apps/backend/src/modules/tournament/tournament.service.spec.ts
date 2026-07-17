jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { TournamentService } from './tournament.service';

const tournamentService = (
  db: never,
  results: { invalidate?: jest.Mock; setSeed?: jest.Mock } = {},
) =>
  new TournamentService(
    {
      ...(db as object),
      query: {
        ...((db as { query?: object }).query ?? {}),
        stages: (db as { query?: { stages?: object } }).query?.stages ?? {
          findFirst: jest.fn().mockResolvedValue(undefined),
        },
      },
    } as never,
    { invalidate: jest.fn(), setSeed: jest.fn(), ...results } as never,
    { assertAssignedTeamCapacity: jest.fn() } as never,
  );

const containsValue = (
  value: unknown,
  expected: unknown,
  seen = new Set<object>(),
): boolean => {
  if (value === expected) return true;
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some((nested) =>
    containsValue(nested, expected, seen),
  );
};

const selectRows = <T>(rows: T[]) => {
  const orderBy = () => Promise.resolve(rows);
  type Query = {
    innerJoin: () => Query;
    leftJoin: () => Query;
    where: () => { orderBy: typeof orderBy };
  };
  const query = {} as Query;
  query.innerJoin = () => query;
  query.leftJoin = () => query;
  query.where = () => ({ orderBy });
  return { select: () => ({ from: () => query }) };
};

describe('TournamentService', () => {
  it('orders teams by qualification seed and puts unseeded teams last', async () => {
    const rows = [
      {
        teamId: 'argentina',
        teamName: 'Argentina',
        teamSeed: 2,
        captainId: 'captain-1',
        user: { id: 'user-1' },
      },
      {
        teamId: 'japan',
        teamName: 'Japan',
        teamSeed: 1,
        captainId: 'captain-2',
        user: { id: 'user-2' },
      },
      {
        teamId: 'unseeded',
        teamName: 'Unseeded',
        teamSeed: null,
        captainId: 'captain-3',
        user: { id: 'user-3' },
      },
    ];
    const service = tournamentService(selectRows(rows) as never);
    jest.spyOn(service, 'getById').mockResolvedValue({ isTeam: true } as never);

    const teams = await service.getTeams({ id: 'tournament' as never });

    expect(teams.map(({ name }) => name)).toEqual([
      'Japan',
      'Argentina',
      'Unseeded',
    ]);
    expect(teams.map(({ seed }) => seed)).toEqual([1, 2, null]);
  });

  describe('qualification roster updates', () => {
    const tournamentId = 'ckm123456789012345678901' as never;
    const teamId = 'ckm123456789012345678902' as never;
    const userId = 'ckm123456789012345678903' as never;

    it('returns solo management fields without changing public DTOs', async () => {
      const rows = [
        {
          id: userId,
          osuId: 42,
          osuUsername: 'player',
          seed: 1,
          withdrawn: false,
          withdrawalReason: null,
        },
      ];
      const service = tournamentService(selectRows(rows) as never);
      jest
        .spyOn(service, 'getById')
        .mockResolvedValue({ isTeam: false } as never);

      await expect(
        service.getQualificationRoster({ id: tournamentId }),
      ).resolves.toEqual({
        kind: 'solo',
        participants: [{ ...rows[0], avatarUrl: 'https://a.ppy.sh/42' }],
      });
    });

    const updateDb = (returned: unknown[] = [{}]) => {
      let condition: unknown;
      const returning = jest.fn().mockResolvedValue(returned);
      const where = jest.fn((value: unknown) => {
        condition = value;
        return { returning };
      });
      const from = jest.fn(() => ({ where }));
      const set = jest.fn(() => ({ from, where }));
      return {
        db: { update: jest.fn(() => ({ set })) },
        set,
        get condition() {
          return condition;
        },
      };
    };

    const deleteDb = () => {
      let condition: unknown;
      const returning = jest.fn().mockResolvedValue([{}]);
      const where = jest.fn((value: unknown) => {
        condition = value;
        return { returning };
      });
      const remove = jest.fn(() => ({ where }));
      const setSeed = jest.fn();
      const service = new TournamentService(
        {
          delete: remove,
          query: {
            stages: {
              findFirst: jest.fn().mockResolvedValue({ id: 'stage-id' }),
            },
          },
        } as never,
        { setSeed } as never,
        {} as never,
      );
      return {
        service,
        setSeed,
        get condition() {
          return condition;
        },
      };
    };

    it('scopes solo updates to tournament and user and clears stale reason', async () => {
      const query = updateDb();
      const service = tournamentService(query.db as never);

      await service.updateSoloQualificationParticipant({
        id: tournamentId,
        userId,
        data: { withdrawn: false, withdrawalReason: 'stale' },
      });

      expect(query.set).toHaveBeenCalledWith({
        withdrawn: false,
        withdrawalReason: null,
      });
      expect(containsValue(query.condition, tournamentId)).toBe(true);
      expect(containsValue(query.condition, userId)).toBe(true);
    });

    it('scopes team updates to tournament and team', async () => {
      const query = updateDb();
      const service = tournamentService(query.db as never);

      await service.updateQualificationTeam({
        id: tournamentId,
        teamId,
        data: { withdrawn: true, withdrawalReason: 'late' },
      });

      expect(query.set).toHaveBeenCalledWith({
        withdrawn: true,
        withdrawalReason: 'late',
      });
      expect(containsValue(query.condition, tournamentId)).toBe(true);
      expect(containsValue(query.condition, teamId)).toBe(true);
    });

    it('scopes team member updates to tournament, team, and user', async () => {
      const query = updateDb();
      const invalidate = jest.fn();
      const service = tournamentService(query.db as never, { invalidate });

      await service.updateQualificationTeamParticipant({
        id: tournamentId,
        teamId,
        userId,
        data: { withdrawn: true, withdrawalReason: 'late' },
      });

      expect(query.set).toHaveBeenCalledWith({
        withdrawn: true,
        withdrawalReason: 'late',
      });
      expect(containsValue(query.condition, tournamentId)).toBe(true);
      expect(containsValue(query.condition, teamId)).toBe(true);
      expect(containsValue(query.condition, userId)).toBe(true);
      expect(invalidate).not.toHaveBeenCalled();
    });

    it('keeps qualification results when withdrawing a solo participant', async () => {
      const query = updateDb();
      const invalidate = jest.fn();
      const setSeed = jest.fn();
      const service = tournamentService(query.db as never, {
        invalidate,
        setSeed,
      });

      await service.updateSoloQualificationParticipant({
        id: tournamentId,
        userId,
        data: { withdrawn: true },
      });

      expect(invalidate).not.toHaveBeenCalled();
      expect(setSeed).not.toHaveBeenCalled();
    });

    it('updates only the selected team seed', async () => {
      const query = updateDb();
      const setSeed = jest.fn();
      const service = tournamentService(
        {
          ...query.db,
          query: {
            stages: {
              findFirst: jest.fn().mockResolvedValue({ id: 'stage-id' }),
            },
          },
        } as never,
        { setSeed },
      );

      await service.updateQualificationTeam({
        id: tournamentId,
        teamId,
        data: { seed: 4, withdrawn: false },
      });

      expect(setSeed).toHaveBeenCalledWith({
        stageId: 'stage-id',
        teamId,
        seed: 4,
      });
    });

    it('reports scoped participants missing from the tournament', async () => {
      const query = updateDb([]);
      const service = tournamentService(query.db as never);

      await expect(
        service.updateSoloQualificationParticipant({
          id: tournamentId,
          userId,
          data: { withdrawn: true },
        }),
      ).rejects.toThrow('Participant not found in tournament');
    });

    it('unregisters a solo participant from the selected tournament', async () => {
      const query = deleteDb();

      await query.service.removeSoloParticipant({
        id: tournamentId,
        userId,
      });

      expect(containsValue(query.condition, tournamentId)).toBe(true);
      expect(containsValue(query.condition, userId)).toBe(true);
      expect(query.setSeed).toHaveBeenCalledWith({
        stageId: 'stage-id',
        userId,
        seed: null,
      });
    });

    it('unregisters a team from the selected tournament', async () => {
      const query = deleteDb();

      await query.service.removeTeam({ id: tournamentId, teamId });

      expect(containsValue(query.condition, tournamentId)).toBe(true);
      expect(containsValue(query.condition, teamId)).toBe(true);
      expect(query.setSeed).toHaveBeenCalledWith({
        stageId: 'stage-id',
        teamId,
        seed: null,
      });
    });
  });

  it('filters tournaments by mode and orders them by nearest start date', async () => {
    let call: Record<string, unknown> = {};
    const findMany = jest.fn((params: Record<string, unknown>) => {
      call = params;
      return Promise.resolve([]);
    });
    const drizzle = {
      query: {
        tournaments: {
          findMany,
        },
      },
    };
    const service = tournamentService(drizzle as never);

    await service.findMany({
      limit: 20,
      offset: 0,
      mode: 'taiko',
      status: 'active',
    });

    expect(call.limit).toBe(20);
    expect(call.offset).toBe(0);
    expect(call.orderBy).toBeDefined();
    expect(call.where).toBeDefined();
  });

  it('archives tournaments by setting archivedAt', async () => {
    const archivedAt = new Date('2026-01-01T00:00:00.000Z');
    const returning = jest.fn().mockResolvedValue([{ id: 'tournament-1' }]);
    const where = jest.fn(() => ({ returning }));
    const set = jest.fn(() => ({ where }));
    const update = jest.fn(() => ({ set }));
    const drizzle = { update };
    const service = tournamentService(drizzle as never);

    await service.archive({ id: 'tournament-1' as never, archivedAt });

    expect(update).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith({ archivedAt });
  });

  it('rejects updates to archived tournaments', async () => {
    const service = tournamentService({} as never);
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'tournament-1',
      archivedAt: new Date('2026-01-01T00:00:00.000Z'),
      startsAt: new Date('2026-01-02T00:00:00.000Z'),
      endsAt: new Date('2026-01-03T00:00:00.000Z'),
    } as never);

    await expect(
      service.update({
        id: 'tournament-1' as never,
        data: { name: 'New name' },
      }),
    ).rejects.toThrow('Archived tournaments cannot be changed');
  });

  it('adds the participant search text to the tournament-scoped query', async () => {
    let condition: unknown;
    const offset = jest.fn().mockResolvedValue([
      {
        user: { id: 'player', osuUsername: 'player' },
        seed: 4,
      },
    ]);
    const limit = jest.fn(() => ({ offset }));
    const orderBy = jest.fn(() => ({ limit }));
    const where = jest.fn((value: unknown) => {
      condition = value;
      return { orderBy };
    });
    const query = { innerJoin: jest.fn(), leftJoin: jest.fn(), where };
    query.innerJoin.mockReturnValue(query);
    query.leftJoin.mockReturnValue(query);
    const from = jest.fn(() => query);
    const service = tournamentService({
      select: jest.fn(() => ({ from })),
    } as never);
    jest
      .spyOn(service, 'getById')
      .mockResolvedValue({ isTeam: false } as never);

    await expect(
      service.getParticipants({
        id: 'ckm123456789012345678901' as never,
        limit: 20,
        offset: 0,
        query: 'player',
      } as never),
    ).resolves.toEqual([{ id: 'player', osuUsername: 'player', seed: 4 }]);

    expect(containsValue(condition, '%player%')).toBe(true);
  });

  it('searches tournament teams by name', async () => {
    const rows = [{ id: 'ckm123456789012345678902', name: 'Red Dragons' }];
    const offset = jest.fn().mockResolvedValue(rows);
    const limit = jest.fn(() => ({ offset }));
    const orderBy = jest.fn(() => ({ limit }));
    const where = jest.fn(() => ({ orderBy }));
    const from = jest.fn(() => ({ where }));
    const service = tournamentService({
      select: jest.fn(() => ({ from })),
    } as never);
    jest.spyOn(service, 'getById').mockResolvedValue({ isTeam: true } as never);

    await expect(
      service.searchTeams({
        id: 'ckm123456789012345678901' as never,
        query: 'red',
        limit: 20,
        offset: 0,
      }),
    ).resolves.toEqual(rows);
  });

  it('does not search teams for a solo tournament', async () => {
    const select = jest.fn();
    const service = tournamentService({ select } as never);
    jest
      .spyOn(service, 'getById')
      .mockResolvedValue({ isTeam: false } as never);

    await expect(
      service.searchTeams({
        id: 'ckm123456789012345678901' as never,
        query: '',
        limit: 20,
        offset: 0,
      }),
    ).resolves.toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });
});
