jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(),
  init: jest.fn(() => jest.fn(() => 'new-room')),
}));

import { randomUUID } from 'crypto';
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  osuMultiplayerGames,
  osuMultiplayerRooms,
  osuMultiplayerScores,
} from 'lib/infrastructure/db';
import * as schema from 'lib/infrastructure/db/schema';
import { Pool } from 'pg';
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

describe('OsuMultiplayerSyncRepository with PostgreSQL', () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const env = {
    get: jest.fn((key: string) =>
      key === 'OSU_MATCH_SYNC_LEASE_MS' ? 60_000 : 15_000,
    ),
  };
  const repository = new OsuMultiplayerSyncRepository(db, env as never);
  const roomIds: string[] = [];
  let createdTables = false;

  beforeAll(async () => {
    const existing = await pool.query(
      `select to_regclass('osu_multiplayer_rooms') as rooms`,
    );
    if (existing.rows[0].rooms) return;
    createdTables = true;
    await pool.query(`
      create table osu_multiplayer_rooms (
        id text primary key, osu_match_id bigint not null unique,
        status text not null default 'active', snapshot_hash text,
        next_sync_at timestamptz not null default now(), lease_until timestamptz,
        lease_token text, last_synced_at timestamptz, last_data_changed_at timestamptz,
        last_error text, attempts integer not null default 0,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now()
      );
      create table osu_multiplayer_games (
        room_id text not null references osu_multiplayer_rooms(id) on delete cascade,
        osu_game_id bigint not null, osu_beatmap_id bigint not null, ended_at timestamptz,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
        primary key (room_id, osu_game_id)
      );
      create table osu_multiplayer_scores (
        room_id text not null, osu_game_id bigint not null, osu_user_id bigint not null,
        osu_beatmap_id bigint not null, score bigint not null, team text,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
        primary key (room_id, osu_game_id, osu_user_id),
        foreign key (room_id, osu_game_id) references osu_multiplayer_games(room_id, osu_game_id) on delete cascade
      );
    `);
  });

  afterAll(async () => {
    if (roomIds.length) {
      await db
        .delete(osuMultiplayerRooms)
        .where(eq(osuMultiplayerRooms.id, roomIds[0] as never));
      for (const roomId of roomIds.slice(1)) {
        await db
          .delete(osuMultiplayerRooms)
          .where(eq(osuMultiplayerRooms.id, roomId as never));
      }
    }
    if (createdTables) {
      await pool.query(
        'drop table osu_multiplayer_scores, osu_multiplayer_games, osu_multiplayer_rooms',
      );
    }
    await pool.end();
  });

  async function createRoom() {
    const roomId = randomUUID();
    await db.insert(osuMultiplayerRooms).values({
      id: roomId as never,
      osuMatchId: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
      leaseToken: 'token',
      leaseUntil: new Date(Date.now() + 60_000),
    });
    roomIds.push(roomId);
    return roomId;
  }

  it('rolls back changed games and scores when a score write fails', async () => {
    const roomId = await createRoom();
    const roomLease = { ...lease, roomId } as never;
    await repository.applySnapshot(roomLease, snapshot);
    await db
      .update(osuMultiplayerRooms)
      .set({ leaseToken: 'token', leaseUntil: new Date(Date.now() + 60_000) })
      .where(eq(osuMultiplayerRooms.id, roomId as never));

    const invalid = {
      ...snapshot,
      games: [
        {
          ...snapshot.games[0],
          scores: [snapshot.games[0].scores[0], snapshot.games[0].scores[0]],
        },
      ],
    };
    await expect(
      repository.applySnapshot(roomLease, invalid),
    ).rejects.toThrow();

    await expect(
      db
        .select({ osuGameId: osuMultiplayerGames.osuGameId })
        .from(osuMultiplayerGames)
        .where(eq(osuMultiplayerGames.roomId, roomId as never)),
    ).resolves.toEqual(
      expect.arrayContaining([{ osuGameId: 1 }, { osuGameId: 2 }]),
    );
  });

  it('allows exactly one of two concurrent claims for a room', async () => {
    const roomId = await createRoom();
    await db
      .update(osuMultiplayerRooms)
      .set({ leaseToken: null, leaseUntil: null })
      .where(eq(osuMultiplayerRooms.id, roomId as never));

    const claims = await Promise.all([
      repository.claim(roomId as never),
      repository.claim(roomId as never),
    ]);

    expect(claims.filter(Boolean)).toHaveLength(1);
  });
});
