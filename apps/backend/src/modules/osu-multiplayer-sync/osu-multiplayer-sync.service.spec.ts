jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(),
  init: jest.fn(() => jest.fn()),
}));

import { OsuMultiplayerSyncService } from './osu-multiplayer-sync.service';

describe('OsuMultiplayerSyncService', () => {
  it('reuses an existing osu match ID', async () => {
    const repository = { ensureRoom: jest.fn().mockResolvedValue('room') };
    const service = new OsuMultiplayerSyncService(
      repository as never,
      {} as never,
    );
    await expect(service.ensureRoom('https://osu.ppy.sh/mp/42')).resolves.toBe(
      'room',
    );
    expect(repository.ensureRoom).toHaveBeenCalledWith(42);
  });

  it('rejects invalid URLs', async () => {
    const service = new OsuMultiplayerSyncService({} as never, {} as never);
    await expect(
      service.ensureRoom('https://example.com/mp/42'),
    ).rejects.toThrow('Invalid osu multiplayer URL');
  });

  it("fetches by the room's osu match ID without a match or lobby type", async () => {
    const lease = {
      roomId: 'room',
      osuMatchId: 42,
      leaseToken: 'token',
      status: 'active',
    };
    const repository = {
      claim: jest.fn().mockResolvedValue(lease),
      applySnapshot: jest
        .fn()
        .mockResolvedValue({ changed: true, status: 'active' }),
    };
    const client = {
      get: jest.fn().mockResolvedValue({ closedAt: null, games: [] }),
    };
    const service = new OsuMultiplayerSyncService(
      repository as never,
      client as never,
    );
    await expect(service.sync('room' as never)).resolves.toEqual({
      changed: true,
      status: 'active',
    });
    expect(client.get).toHaveBeenCalledWith(42);
    expect(repository.claim).toHaveBeenCalledWith('room', false);
  });
});
