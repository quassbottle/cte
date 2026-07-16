jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(),
  init: jest.fn(() => jest.fn(() => 'new-room')),
}));

import {
  osuMultiplayerGames,
  osuMultiplayerRooms,
  osuMultiplayerScores,
} from 'lib/infrastructure/db';
import { OsuMultiplayerSyncRepository } from './osu-multiplayer-sync.repository';

const lease = {
  roomId: 'room',
  osuMatchId: 42,
  leaseToken: 'token',
  status: 'active' as const,
};
const snapshot = {
  closedAt: null,
  games: [
    {
      id: 2,
      beatmapId: 999_002,
      endedAt: new Date('2026-01-02T00:00:00Z'),
      scores: [{ userId: 888_002, score: 20, team: 'blue' as const }],
    },
    {
      id: 1,
      beatmapId: 999_001,
      endedAt: new Date('2026-01-01T00:00:00Z'),
      scores: [{ userId: 888_001, score: 10, team: null }],
    },
  ],
};

function repository(room: Record<string, unknown>) {
  const writes: { table: unknown; values: unknown }[] = [];
  const updates: { table: unknown; values: Record<string, unknown> }[] = [];
  const tx = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          for: () => ({
            limit: async () => (table === osuMultiplayerRooms ? [room] : []),
          }),
          limit: async () => (table === osuMultiplayerRooms ? [room] : []),
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        writes.push({ table, values });
        return { onConflictDoUpdate: async () => undefined };
      },
    }),
    delete: () => ({ where: async () => undefined }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => {
        updates.push({ table, values });
        return { where: async () => undefined };
      },
    }),
  };
  const db = {
    transaction: (callback: (value: typeof tx) => unknown) => callback(tx),
  };
  return {
    repository: new OsuMultiplayerSyncRepository(
      db as never,
      { get: jest.fn(() => 60_000) } as never,
    ),
    writes,
    updates,
  };
}

describe('OsuMultiplayerSyncRepository', () => {
  it('persists unknown osu users and beatmaps instead of dropping their scores', async () => {
    const test = repository({ roomId: lease.roomId, snapshotHash: null });

    await test.repository.applySnapshot(lease as never, snapshot);

    expect(test.writes).toEqual(
      expect.arrayContaining([
        {
          table: osuMultiplayerGames,
          values: expect.arrayContaining([
            expect.objectContaining({ osuBeatmapId: 999_001 }),
            expect.objectContaining({ osuBeatmapId: 999_002 }),
          ]),
        },
        {
          table: osuMultiplayerScores,
          values: expect.arrayContaining([
            expect.objectContaining({
              osuUserId: 888_001,
              osuBeatmapId: 999_001,
            }),
            expect.objectContaining({
              osuUserId: 888_002,
              osuBeatmapId: 999_002,
            }),
          ]),
        },
      ]),
    );
  });

  it('returns changed false for the same normalized snapshot', async () => {
    const first = repository({ roomId: lease.roomId, snapshotHash: null });
    await first.repository.applySnapshot(lease as never, snapshot);
    const hash = first.updates.find(
      ({ table }) => table === osuMultiplayerRooms,
    )!.values.snapshotHash;
    const second = repository({ roomId: lease.roomId, snapshotHash: hash });

    await expect(
      second.repository.applySnapshot(lease as never, {
        ...snapshot,
        games: [...snapshot.games].reverse(),
      }),
    ).resolves.toEqual({ changed: false, status: 'active' });
    expect(
      second.writes.filter(({ table }) => table !== osuMultiplayerRooms),
    ).toHaveLength(0);
  });

  it('upserts changed games and scores atomically', async () => {
    const test = repository({ roomId: lease.roomId, snapshotHash: 'old' });
    await test.repository.applySnapshot(lease as never, snapshot);
    expect(test.writes.map(({ table }) => table)).toEqual(
      expect.arrayContaining([osuMultiplayerGames, osuMultiplayerScores]),
    );
  });

  it('allows only one unexpired lease for a room', async () => {
    const db = {
      transaction: jest
        .fn()
        .mockResolvedValueOnce(lease)
        .mockResolvedValueOnce(null),
    };
    const repository = new OsuMultiplayerSyncRepository(
      db as never,
      { get: jest.fn(() => 60_000) } as never,
    );
    await expect(repository.claim(lease.roomId as never)).resolves.toEqual(
      lease,
    );
    await expect(repository.claim(lease.roomId as never)).resolves.toBeNull();
  });
});
