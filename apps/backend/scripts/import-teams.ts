import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { teamId } from '../src/lib/domain/team/team.id';
import { TournamentId } from '../src/lib/domain/tournament/tournament.id';
import { UserId, userId } from '../src/lib/domain/user/user.id';
import {
  Schema,
  teamParticipants,
  teams,
  tournaments,
  users,
} from '../src/lib/infrastructure/db';

type CliArgs = {
  tournamentId: TournamentId;
  filePath: string;
  mode: 'osu' | 'taiko' | 'fruits' | 'mania';
  concurrency: number;
};

type TeamRow = {
  line: number;
  teamName: string;
  players: string[];
};

type OsuTokenResponse = {
  access_token?: string;
  error?: string;
};

type OsuUserResponse = {
  id?: number;
  username?: string;
};

const printHelpAndExit = (): never => {
  console.log(
    [
      'Usage:',
      '  pnpm teams:import -- --tournament-id <id> [--file ../../teams.txt] [--mode taiko] [--concurrency 4]',
      '',
      'Options:',
      '  --tournament-id   Target tournament id (required)',
      '  --file            Path to teams TSV file (default: ../../teams.txt)',
      '  --mode            osu API mode for username lookup: osu|taiko|fruits|mania (default: taiko)',
      '  --concurrency     Parallel osu lookups (default: 4)',
      '  --help            Show this help',
    ].join('\n'),
  );
  process.exit(0);
};

const parseArgs = (): CliArgs => {
  const argv = process.argv.slice(2);
  let tournamentId = '';
  let filePath = '../../teams.txt';
  let mode: CliArgs['mode'] = 'taiko';
  let concurrency = 4;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--tournament-id' && argv[i + 1]) {
      tournamentId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--tournament-id=')) {
      tournamentId = arg.slice('--tournament-id='.length);
      continue;
    }
    if (arg === '--file' && argv[i + 1]) {
      filePath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--file=')) {
      filePath = arg.slice('--file='.length);
      continue;
    }
    if (arg === '--mode' && argv[i + 1]) {
      const value = argv[i + 1];
      if (isGameMode(value)) {
        mode = value;
      } else {
        throw new Error(`Invalid --mode value: ${value}`);
      }
      i += 1;
      continue;
    }
    if (arg.startsWith('--mode=')) {
      const value = arg.slice('--mode='.length);
      if (isGameMode(value)) {
        mode = value;
      } else {
        throw new Error(`Invalid --mode value: ${value}`);
      }
      continue;
    }
    if (arg === '--concurrency' && argv[i + 1]) {
      const value = Number.parseInt(argv[i + 1], 10);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Invalid --concurrency value: ${argv[i + 1]}`);
      }
      concurrency = value;
      i += 1;
      continue;
    }
    if (arg.startsWith('--concurrency=')) {
      const value = Number.parseInt(arg.slice('--concurrency='.length), 10);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Invalid --concurrency value: ${arg}`);
      }
      concurrency = value;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelpAndExit();
    }
  }

  if (!tournamentId.trim()) {
    throw new Error(
      'Missing --tournament-id. Example: --tournament-id=cmah2z0ot00058o0f2uoqivx7',
    );
  }

  return {
    tournamentId: tournamentId as TournamentId,
    filePath,
    mode,
    concurrency,
  };
};

const isGameMode = (value: string): value is CliArgs['mode'] => {
  return ['osu', 'taiko', 'fruits', 'mania'].includes(value);
};

const parseTeamsFile = (filePath: string): TeamRow[] => {
  const absolute = resolve(process.cwd(), filePath);
  if (!existsSync(absolute)) {
    throw new Error(`File not found: ${absolute}`);
  }

  const raw = readFileSync(absolute, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('teams file must include header and at least one data row');
  }

  return lines
    .slice(1)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 2 }))
    .map(({ line, lineNumber }) => {
      const cols = line.split('\t').map((cell) => cell.trim());
      const teamName = cols[0];
      const players = cols.slice(1).filter((cell) => cell.length > 0);

      if (!teamName) {
        throw new Error(`Line ${lineNumber}: empty team name`);
      }
      if (players.length === 0) {
        throw new Error(`Line ${lineNumber}: team has no players`);
      }

      const deduped = [...new Set(players)];
      return {
        line: lineNumber,
        teamName,
        players: deduped,
      };
    });
};

const getOsuToken = async (
  clientId: string,
  clientSecret: string,
): Promise<string> => {
  const response = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: Number(clientId),
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'public',
    }),
  });

  const payload = (await response.json()) as OsuTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(`osu token error: ${payload.error ?? response.statusText}`);
  }

  return payload.access_token;
};

const getOsuUserByUsername = async (
  params: { token: string; username: string; mode: CliArgs['mode'] },
): Promise<{ osuId: number; osuUsername: string }> => {
  const { token, username, mode } = params;
  const encoded = encodeURIComponent(username);
  const response = await fetch(
    `https://osu.ppy.sh/api/v2/users/${encoded}/${mode}?key=username`,
    {
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
  );

  if (response.status === 404) {
    throw new Error(`osu user not found: ${username}`);
  }

  if (!response.ok) {
    throw new Error(`osu lookup failed for "${username}": HTTP ${response.status}`);
  }

  const payload = (await response.json()) as OsuUserResponse;
  if (!payload.id || !payload.username) {
    throw new Error(`osu payload malformed for "${username}"`);
  }

  return {
    osuId: payload.id,
    osuUsername: payload.username,
  };
};

const mapWithConcurrency = async <TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> => {
  const out = new Array<TOutput>(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await mapper(items[index], index);
    }
  };

  const count = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: count }, () => worker()));
  return out;
};

const upsertUsers = async (
  drizzle: Schema,
  usersToEnsure: string[],
  token: string,
  mode: CliArgs['mode'],
  concurrency: number,
): Promise<Map<string, UserId>> => {
  const result = new Map<string, UserId>();

  const resolved = await mapWithConcurrency(
    usersToEnsure,
    concurrency,
    async (username, index) => {
      const osu = await getOsuUserByUsername({ token, username, mode });
      console.log(
        `[osu ${index + 1}/${usersToEnsure.length}] ${username} -> ${osu.osuUsername} (${osu.osuId})`,
      );
      return { requestedUsername: username, ...osu };
    },
  );

  for (const row of resolved) {
    const existing = await drizzle.query.users.findFirst({
      where: eq(users.osuId, row.osuId),
    });

    if (!existing) {
      const [created] = await drizzle
        .insert(users)
        .values({
          id: userId(),
          osuId: row.osuId,
          osuUsername: row.osuUsername,
        })
        .returning();

      if (!created) {
        throw new Error(`Failed to create user ${row.osuUsername}`);
      }

      result.set(row.requestedUsername, created.id);
      continue;
    }

    if (existing.osuUsername !== row.osuUsername) {
      await drizzle
        .update(users)
        .set({ osuUsername: row.osuUsername })
        .where(eq(users.id, existing.id));
    }

    result.set(row.requestedUsername, existing.id);
  }

  return result;
};

const createTeams = async (
  drizzle: Schema,
  params: {
    rows: TeamRow[];
    tournamentId: TournamentId;
    userIdByOriginalName: Map<string, UserId>;
  },
): Promise<{ created: number; skipped: number }> => {
  const { rows, tournamentId, userIdByOriginalName } = params;
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const participantIds = row.players
      .map((player) => userIdByOriginalName.get(player))
      .filter((id): id is UserId => !!id);

    if (participantIds.length === 0) {
      throw new Error(`Line ${row.line}: no resolved users`);
    }

    const captainId = participantIds[0];

    const existingWithName = await drizzle.query.teams.findFirst({
      where: and(
        eq(teams.tournamentId, tournamentId),
        eq(teams.name, row.teamName),
      ),
    });
    if (existingWithName) {
      skipped += 1;
      console.log(`[skip] Team "${row.teamName}" already exists`);
      continue;
    }

    const conflict = await drizzle
      .select({ userId: teamParticipants.userId })
      .from(teamParticipants)
      .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
      .where(
        and(
          eq(teams.tournamentId, tournamentId),
          inArray(teamParticipants.userId, participantIds),
        ),
      )
      .limit(1);

    if (conflict.length > 0) {
      skipped += 1;
      console.log(
        `[skip] Team "${row.teamName}" has players already registered in another team`,
      );
      continue;
    }

    await drizzle.transaction(async (tx) => {
      const id = teamId();

      await tx.insert(teams).values({
        id,
        name: row.teamName,
        captainId,
        tournamentId,
      });

      await tx.insert(teamParticipants).values(
        participantIds.map((participantId) => ({
          teamId: id,
          userId: participantId,
        })),
      );
    });

    created += 1;
    console.log(`[create] Team "${row.teamName}" (${participantIds.length} players)`);
  }

  return { created, skipped };
};

const main = async () => {
  const args = parseArgs();
  const rows = parseTeamsFile(args.filePath);

  const uniqueUsers = [...new Set(rows.flatMap((team) => team.players))];
  console.log(
    `[import] parsed ${rows.length} teams, ${uniqueUsers.length} unique users from ${resolve(process.cwd(), args.filePath)}`,
  );

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const drizzle = app.get<Schema>('DB');

    const tournament = await drizzle.query.tournaments.findFirst({
      where: eq(tournaments.id, args.tournamentId),
    });
    if (!tournament) {
      throw new Error(`Tournament not found: ${args.tournamentId}`);
    }
    if (!tournament.isTeam) {
      throw new Error(`Tournament ${args.tournamentId} is not team-based`);
    }
    if (tournament.deletedAt) {
      throw new Error(`Tournament ${args.tournamentId} is deleted`);
    }

    const clientId = process.env.OSU_CLIENT_ID;
    const clientSecret = process.env.OSU_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('OSU_CLIENT_ID and OSU_CLIENT_SECRET are required');
    }

    const token = await getOsuToken(clientId, clientSecret);
    const userIdByOriginalName = await upsertUsers(
      drizzle,
      uniqueUsers,
      token,
      args.mode,
      args.concurrency,
    );

    const result = await createTeams(drizzle, {
      rows,
      tournamentId: args.tournamentId,
      userIdByOriginalName,
    });

    const userCount = await drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    console.log('');
    console.log('[import] done');
    console.log(`[import] users ensured: ${userIdByOriginalName.size}`);
    console.log(`[import] teams created: ${result.created}`);
    console.log(`[import] teams skipped: ${result.skipped}`);
    console.log(`[import] users total in DB: ${userCount[0]?.count ?? 0}`);
  } finally {
    await app.close();
  }
};

void main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error', error);
  }
  process.exit(1);
});
