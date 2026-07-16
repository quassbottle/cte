jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { QualificationLobbyService } from './qualification-lobby.service';

describe('QualificationLobbyService', () => {
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
