jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { teamParticipants, teams } from 'lib/infrastructure/db';
import * as qualificationSeeding from './qualification-seeding';
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

    const transactionDb = (options?: {
      stage?: unknown;
      beatmaps?: unknown[];
    }) => {
      const selectRows = [
        options?.beatmaps ?? [{ beatmapId: 'map-1' }],
        [
          {
            osuGameId: 7,
            beatmapId: 'map-1',
            userId: 'active-user',
            score: 123,
          },
        ],
        [
          {
            id: 'active-user',
            userId: 'active-user',
            osuId: 42,
          },
        ],
      ];
      const updateConditions: unknown[] = [];
      const set = jest.fn((value: unknown) => ({
        where: jest.fn((condition: unknown) => {
          updateConditions.push(condition);
          return Promise.resolve(value);
        }),
      }));
      const tx = {
        query: {
          tournaments: {
            findFirst: jest.fn().mockResolvedValue({ isTeam: false }),
          },
          stages: {
            findFirst: jest
              .fn()
              .mockResolvedValue(
                options?.stage === undefined
                  ? { id: 'stage-1' }
                  : options.stage,
              ),
          },
        },
        select: jest.fn(() => {
          const rows = selectRows.shift() ?? [];
          const where = jest.fn().mockResolvedValue(rows);
          const innerJoin = jest.fn(() => ({ innerJoin, where }));
          return { from: jest.fn(() => ({ innerJoin, where })) };
        }),
        update: jest.fn(() => ({ set })),
      };
      return {
        drizzle: {
          transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
            callback(tx),
          ),
        },
        tx,
        set,
        updateConditions,
      };
    };

    it('clears all solo seeds then writes only calculated active competitors', async () => {
      const fake = transactionDb();
      const service = new TournamentService(fake.drizzle as never);
      jest.spyOn(service, 'getQualificationRoster').mockResolvedValue({
        kind: 'solo',
        participants: [],
      });
      const calculator = jest
        .spyOn(qualificationSeeding, 'calculateQualificationSeeds')
        .mockReturnValue([
          {
            competitorId: 'active-user',
            seed: 1,
            averagePlace: 1,
            totalScore: 123,
          },
        ]);

      await service.calculateQualificationSeeds({ id: tournamentId });

      expect(calculator).toHaveBeenCalledWith({
        beatmapIds: ['map-1'],
        competitors: [
          { id: 'active-user', tieBreakId: 42, userIds: ['active-user'] },
        ],
        attempts: [
          {
            osuGameId: 7,
            beatmapId: 'map-1',
            userId: 'active-user',
            score: 123,
          },
        ],
      });
      expect(fake.set).toHaveBeenCalledWith({ seed: null });
      expect(fake.set).toHaveBeenCalledWith({ seed: 1 });
      expect(fake.set.mock.calls.map(([value]) => value)).toEqual([
        { seed: null },
        { seed: 1 },
      ]);
      expect(fake.updateConditions).toHaveLength(2);
      expect(
        fake.updateConditions.every((condition) =>
          containsValue(condition, tournamentId),
        ),
      ).toBe(true);
    });

    it('rejects a missing qualification stage before updating', async () => {
      const fake = transactionDb({ stage: null });
      const service = new TournamentService(fake.drizzle as never);

      await expect(
        service.calculateQualificationSeeds({ id: tournamentId }),
      ).rejects.toThrow('Qualification stage not found');
      expect(fake.tx.update).not.toHaveBeenCalled();
    });

    it('rejects an empty qualification mappool before updating', async () => {
      const fake = transactionDb({ beatmaps: [] });
      const service = new TournamentService(fake.drizzle as never);

      await expect(
        service.calculateQualificationSeeds({ id: tournamentId }),
      ).rejects.toThrow('Qualification mappool is empty');
      expect(fake.tx.update).not.toHaveBeenCalled();
    });

    it('excludes withdrawn teams but keeps withdrawn members of active teams', async () => {
      const conditions: unknown[] = [];
      const rows = [
        [{ beatmapId: 'map-1' }],
        [],
        [
          { teamId: 'team-1', userId: 'active-member' },
          { teamId: 'team-1', userId: 'withdrawn-member' },
        ],
      ];
      const updateConditions: unknown[] = [];
      const set = jest.fn((value: unknown) => ({
        where: jest.fn((condition: unknown) => {
          updateConditions.push(condition);
          return Promise.resolve(value);
        }),
      }));
      const tx = {
        query: {
          tournaments: {
            findFirst: jest.fn().mockResolvedValue({ isTeam: true }),
          },
          stages: {
            findFirst: jest.fn().mockResolvedValue({ id: 'stage-1' }),
          },
        },
        select: jest.fn(() => {
          const where = jest.fn((condition: unknown) => {
            conditions.push(condition);
            return Promise.resolve(rows.shift() ?? []);
          });
          const innerJoin = jest.fn(() => ({ innerJoin, where }));
          return { from: jest.fn(() => ({ innerJoin, where })) };
        }),
        update: jest.fn(() => ({ set })),
      };
      const service = new TournamentService({
        transaction: jest.fn(async (callback) => callback(tx)),
      } as never);
      jest
        .spyOn(service, 'getQualificationRoster')
        .mockResolvedValue({ kind: 'team', teams: [] });
      const calculator = jest
        .spyOn(qualificationSeeding, 'calculateQualificationSeeds')
        .mockReturnValue([
          {
            competitorId: 'team-1',
            seed: 1,
            averagePlace: 1,
            totalScore: 0,
          },
        ]);

      await service.calculateQualificationSeeds({ id: tournamentId });

      expect(calculator).toHaveBeenCalledWith(
        expect.objectContaining({
          competitors: [
            {
              id: 'team-1',
              tieBreakId: 'team-1',
              userIds: ['active-member', 'withdrawn-member'],
            },
          ],
        }),
      );
      expect(containsValue(conditions.at(-1), teams.withdrawn)).toBe(true);
      expect(containsValue(conditions.at(-1), teamParticipants.withdrawn)).toBe(
        false,
      );
      expect(set.mock.calls.map(([value]) => value)).toEqual([
        { seed: null },
        { seed: 1 },
      ]);
      expect(updateConditions).toHaveLength(2);
      expect(
        updateConditions.every((condition) =>
          containsValue(condition, tournamentId),
        ),
      ).toBe(true);
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
      const innerJoin = jest.fn(() => ({ where }));
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
