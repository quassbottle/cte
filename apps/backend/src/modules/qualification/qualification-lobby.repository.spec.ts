jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { QualificationLobbyRepository } from './qualification-lobby.repository';

describe('QualificationLobbyRepository', () => {
  it('rejects selection after locking a started qualification stage', async () => {
    const tx = {
      execute: jest.fn(),
      select: jest.fn(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ startsAt: new Date(0) }],
          }),
        }),
      })),
      delete: jest.fn(),
    };
    const repository = new QualificationLobbyRepository({
      transaction: (callback: (tx: never) => unknown) => callback(tx as never),
    } as never);

    await expect(
      repository.selectSolo({
        lobbyId: 'lobby' as never,
        stageId: 'stage' as never,
        userId: 'user' as never,
      }),
    ).rejects.toThrow('Qualification stage has started');

    expect(tx.execute).toHaveBeenCalledTimes(1);
    expect(tx.delete).not.toHaveBeenCalled();
  });

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
            where: () => ({
              limit: async () => [{ startsAt: new Date('2030-01-01') }],
            }),
          }),
        }))
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
