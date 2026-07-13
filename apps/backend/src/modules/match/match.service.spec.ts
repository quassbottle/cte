jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { TournamentId } from 'lib/domain/tournament/tournament.id';
import { UserId } from 'lib/domain/user/user.id';
import { ScheduleMatchUpsertInput, scheduleMatchUpsertDtoSchema } from './dto';
import { MatchService } from './match.service';

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
        ): Promise<void>;
      }
    ).assertMatchCompetitors(tournamentId, input);

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
