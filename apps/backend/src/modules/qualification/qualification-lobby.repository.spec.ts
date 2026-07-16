import { QualificationLobbyRepository } from './qualification-lobby.repository';

describe('QualificationLobbyRepository', () => {
  it('locks the lobby before replacing an assignment and counting the final seat', async () => {
    const calls: string[] = [];
    const tx = {
      execute: jest.fn(() => calls.push('stage-lock')),
      delete: jest.fn(() => ({
        where: jest.fn(() => {
          calls.push('delete');
        }),
      })),
      select: jest
        .fn()
        .mockImplementationOnce(() => ({
          from: () => ({
            where: async () => {
              calls.push('players');
              return [{ value: 15 }];
            },
          }),
        }))
        .mockImplementationOnce(() => ({
          from: () => ({
            where: async () => {
              calls.push('teams');
              return [];
            },
          }),
        })),
      insert: jest.fn(() => ({
        values: jest.fn(() => calls.push('insert')),
      })),
    };
    const db = {
      transaction: (callback: (tx: never) => unknown) => callback(tx as never),
    };
    const repository = new QualificationLobbyRepository(db as never);

    await repository.selectSolo({
      lobbyId: 'lobby' as never,
      stageId: 'stage' as never,
      userId: 'user' as never,
    });

    expect(calls).toEqual([
      'stage-lock',
      'delete',
      'players',
      'teams',
      'insert',
    ]);
  });

  it('rejects activating a seventeenth seat in an assigned team lobby', async () => {
    const db = {
      execute: jest.fn(),
      select: jest
        .fn()
        .mockImplementationOnce(() => ({
          from: () => ({ where: async () => [{ lobbyId: 'lobby' }] }),
        }))
        .mockImplementationOnce(() => ({
          from: () => ({ where: async () => [{ value: 0 }] }),
        }))
        .mockImplementationOnce(() => ({
          from: () => ({ where: async () => [{ teamId: 'team' }] }),
        }))
        .mockImplementationOnce(() => ({
          from: () => ({ where: async () => [{ value: 17 }] }),
        })),
    };
    const repository = new QualificationLobbyRepository({} as never);

    await expect(
      repository.assertAssignedTeamCapacity(
        db as never,
        'stage' as never,
        'team' as never,
      ),
    ).rejects.toThrow('Qualification lobby is full');
  });
});
