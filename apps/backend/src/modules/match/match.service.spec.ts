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
        matches: {
          findFirst: jest.fn().mockResolvedValue({ mpUrl: null }),
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

  it('requires an mp URL for a solo-tournament qualification lobby', async () => {
    await expect(
      createService(false).createScheduleMatch({
        tournamentId,
        data: qualificationData({ mpUrl: null }),
      }),
    ).rejects.toThrow('Qualification lobby requires an mp URL');
  });

  it('rejects players in a qualification lobby', async () => {
    await expect(
      createService(false).createScheduleMatch({
        tournamentId,
        data: qualificationData({
          players: [{ userId: playerId, score: null }],
        }),
      }),
    ).rejects.toThrow('Qualification lobby cannot select competitors');
  });

  it('rejects teams in a team-tournament qualification lobby', async () => {
    await expect(
      createService(true).createScheduleMatch({
        tournamentId,
        data: qualificationData({
          redTeamId: 'ckm123456789012345678905',
          blueTeamId: 'ckm123456789012345678906',
        }),
      }),
    ).rejects.toThrow('Qualification lobby cannot select competitors');
  });

  it('rejects competitors when updating a qualification lobby', async () => {
    await expect(
      createService(false).updateScheduleMatch({
        tournamentId,
        matchId: 'ckm123456789012345678907' as never,
        data: qualificationData({
          players: [{ userId: playerId, score: null }],
        }),
      }),
    ).rejects.toThrow('Qualification lobby cannot select competitors');
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
