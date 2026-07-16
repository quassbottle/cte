jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { TournamentService } from './tournament.service';

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

describe('TournamentService', () => {
  describe('qualification seed recalculation', () => {
    const tournamentId = 'ckm123456789012345678901' as never;

    it('delegates qualification result calculation to the qualification module', async () => {
      const results = { recalculate: jest.fn() };
      const service = new TournamentService(
        {
          query: {
            stages: {
              findFirst: jest.fn().mockResolvedValue({ id: 'stage-1' }),
            },
          },
        } as never,
        results as never,
      );
      jest.spyOn(service, 'getQualificationRoster').mockResolvedValue({
        kind: 'solo',
        participants: [],
      });

      await service.calculateQualificationSeeds({ id: tournamentId });

      expect(results.recalculate).toHaveBeenCalledWith('stage-1');
    });

    it('rejects a missing qualification stage before delegating', async () => {
      const results = { recalculate: jest.fn() };
      const service = new TournamentService(
        {
          query: {
            stages: { findFirst: jest.fn().mockResolvedValue(undefined) },
          },
        } as never,
        results as never,
      );

      await expect(
        service.calculateQualificationSeeds({ id: tournamentId }),
      ).rejects.toThrow('Qualification stage not found');
      expect(results.recalculate).not.toHaveBeenCalled();
    });
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
      const orderBy = jest.fn().mockResolvedValue(rows);
      const where = jest.fn(() => ({ orderBy }));
      const leftJoin = jest.fn(() => ({ where }));
      const innerJoin = jest.fn(() => ({ innerJoin, leftJoin, where }));
      const from = jest.fn(() => ({ innerJoin }));
      const service = new TournamentService({
        select: jest.fn(() => ({ from })),
      } as never);
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

    it('scopes solo updates to tournament and user and clears stale reason', async () => {
      const query = updateDb();
      const service = new TournamentService(query.db as never);

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
      const service = new TournamentService(query.db as never);

      await service.updateQualificationTeam({
        id: tournamentId,
        teamId,
        data: { seed: 2 },
      });

      expect(query.set).toHaveBeenCalledWith({ seed: 2 });
      expect(containsValue(query.condition, tournamentId)).toBe(true);
      expect(containsValue(query.condition, teamId)).toBe(true);
    });

    it('scopes team member updates to tournament, team, and user', async () => {
      const query = updateDb();
      const service = new TournamentService(query.db as never);

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
    });

    it('reports scoped participants missing from the tournament', async () => {
      const query = updateDb([]);
      const service = new TournamentService(query.db as never);

      await expect(
        service.updateSoloQualificationParticipant({
          id: tournamentId,
          userId,
          data: { seed: 1 },
        }),
      ).rejects.toThrow('Participant not found in tournament');
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
    const service = new TournamentService(drizzle as never);

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
    const service = new TournamentService(drizzle as never);

    await service.archive({ id: 'tournament-1' as never, archivedAt });

    expect(update).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith({ archivedAt });
  });

  it('rejects updates to archived tournaments', async () => {
    const service = new TournamentService({} as never);
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
    const offset = jest.fn().mockResolvedValue([]);
    const limit = jest.fn(() => ({ offset }));
    const where = jest.fn((value: unknown) => {
      condition = value;
      return { limit };
    });
    const innerJoin = jest.fn(() => ({ where }));
    const from = jest.fn(() => ({ innerJoin }));
    const service = new TournamentService({
      select: jest.fn(() => ({ from })),
    } as never);
    jest
      .spyOn(service, 'getById')
      .mockResolvedValue({ isTeam: false } as never);

    await service.getParticipants({
      id: 'ckm123456789012345678901' as never,
      limit: 20,
      offset: 0,
      query: 'player',
    } as never);

    expect(containsValue(condition, '%player%')).toBe(true);
  });

  it('searches tournament teams by name', async () => {
    const rows = [{ id: 'ckm123456789012345678902', name: 'Red Dragons' }];
    const offset = jest.fn().mockResolvedValue(rows);
    const limit = jest.fn(() => ({ offset }));
    const orderBy = jest.fn(() => ({ limit }));
    const where = jest.fn(() => ({ orderBy }));
    const from = jest.fn(() => ({ where }));
    const service = new TournamentService({
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
    const service = new TournamentService({ select } as never);
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
