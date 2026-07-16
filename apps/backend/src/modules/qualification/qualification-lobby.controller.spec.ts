jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id'),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { QualificationLobbyController } from './qualification-lobby.controller';

describe('QualificationLobbyController', () => {
  const tournamentId = 'tournament' as never;
  const lobbyId = 'ckm123456789012345678901';
  const user = { id: 'user' } as never;

  it('uses the authenticated user for solo selection and accepts no userId override', async () => {
    const service = { joinSolo: jest.fn() };
    const controller = new QualificationLobbyController(service as never);

    await controller.selectSolo(tournamentId, lobbyId, user);

    expect(service.joinSolo).toHaveBeenCalledWith({
      tournamentId,
      lobbyId,
      userId: 'user',
    });
  });

  it('scopes sync to the route tournament', async () => {
    const service = { sync: jest.fn() };
    const controller = new QualificationLobbyController(service as never);

    await controller.sync(tournamentId, lobbyId);

    expect(service.sync).toHaveBeenCalledWith({
      tournamentId,
      lobbyId,
    });
  });
});
