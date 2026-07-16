jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(),
  init: jest.fn(() => jest.fn(() => 'test-id')),
}));

import { randomUUID } from 'crypto';
import 'dotenv/config';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  qualificationLobbies,
  qualificationLobbyPlayers,
  stages,
  tournaments,
  users,
} from 'lib/infrastructure/db';
import * as schema from 'lib/infrastructure/db/schema';
import { Pool } from 'pg';
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

describe('QualificationLobbyRepository with PostgreSQL', () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const repository = new QualificationLobbyRepository(db);
  let createdTables = false;
  const ids = {
    tournament: randomUUID(),
    stage: randomUUID(),
    target: randomUUID(),
    source: randomUUID(),
    users: Array.from({ length: 18 }, () => randomUUID()),
  };

  beforeAll(async () => {
    const existing = await pool.query(
      `select to_regclass('qualification_lobbies') as lobbies`,
    );
    if (!existing.rows[0].lobbies) {
      createdTables = true;
      await pool.query(`
        create table qualification_lobbies (
          id text primary key, stage_id text not null references stages(id) on delete cascade,
          number integer not null, referee_id text not null references users(id),
          starts_at timestamp not null, ends_at timestamptz not null, mp_url text,
          osu_room_id text, created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(), unique (id, stage_id)
        );
        create table qualification_lobby_players (
          lobby_id text not null, stage_id text not null, user_id text not null references users(id),
          created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
          primary key (lobby_id, user_id), unique (stage_id, user_id),
          foreign key (lobby_id, stage_id) references qualification_lobbies(id, stage_id) on delete cascade
        );
        create table qualification_lobby_teams (
          lobby_id text not null, stage_id text not null, team_id text not null references teams(id),
          created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
          primary key (lobby_id, team_id), unique (stage_id, team_id),
          foreign key (lobby_id, stage_id) references qualification_lobbies(id, stage_id) on delete cascade
        );
      `);
    }
    await db.insert(users).values(
      ids.users.map((id, index) => ({
        id: id as never,
        osuId: 1_900_000_000 + index + Math.floor(Math.random() * 10_000),
        osuUsername: `qualification-lock-${id}`,
      })),
    );
    await db.insert(tournaments).values({
      id: ids.tournament as never,
      name: 'Qualification locking test',
      creatorId: ids.users[0] as never,
      startsAt: new Date('2030-01-01T00:00:00Z'),
      endsAt: new Date('2030-01-02T00:00:00Z'),
    });
    await db.insert(stages).values({
      id: ids.stage as never,
      tournamentId: ids.tournament as never,
      name: 'Qualification',
      type: 'qualification',
      startsAt: new Date('2030-01-01T00:00:00Z'),
      endsAt: new Date('2030-01-02T00:00:00Z'),
    });
    await db.insert(qualificationLobbies).values([
      {
        id: ids.target as never,
        stageId: ids.stage as never,
        number: 1,
        refereeId: ids.users[0] as never,
        startsAt: new Date('2030-01-01T00:00:00Z'),
        endsAt: new Date('2030-01-01T01:00:00Z'),
      },
      {
        id: ids.source as never,
        stageId: ids.stage as never,
        number: 2,
        refereeId: ids.users[0] as never,
        startsAt: new Date('2030-01-01T00:00:00Z'),
        endsAt: new Date('2030-01-01T01:00:00Z'),
      },
    ]);
    await db.insert(qualificationLobbyPlayers).values([
      ...ids.users.slice(0, 15).map((userId) => ({
        lobbyId: ids.target as never,
        stageId: ids.stage as never,
        userId: userId as never,
      })),
      ...ids.users.slice(15, 17).map((userId) => ({
        lobbyId: ids.source as never,
        stageId: ids.stage as never,
        userId: userId as never,
      })),
    ]);
  });

  afterAll(async () => {
    await db
      .delete(tournaments)
      .where(eq(tournaments.id, ids.tournament as never));
    await db.delete(users).where(inArray(users.id, ids.users as never));
    if (createdTables) {
      await pool.query(
        'drop table qualification_lobby_teams, qualification_lobby_players, qualification_lobbies',
      );
    }
    await pool.end();
  });

  it('allows only one of two concurrent moves into the final seat', async () => {
    const results = await Promise.allSettled(
      ids.users.slice(15, 17).map((userId) =>
        repository.selectSolo({
          lobbyId: ids.target as never,
          stageId: ids.stage as never,
          userId: userId as never,
        }),
      ),
    );
    const seats = await db
      .select({ userId: qualificationLobbyPlayers.userId })
      .from(qualificationLobbyPlayers)
      .where(
        and(
          eq(qualificationLobbyPlayers.stageId, ids.stage as never),
          eq(qualificationLobbyPlayers.lobbyId, ids.target as never),
        ),
      );

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    expect(seats).toHaveLength(16);
    expect(
      (
        results.find(
          ({ status }) => status === 'rejected',
        ) as PromiseRejectedResult
      ).reason.message,
    ).toContain('Qualification lobby is full');
  });
});
