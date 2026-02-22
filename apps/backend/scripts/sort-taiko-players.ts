import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

type CliOptions = {
  inputPath: string;
  outputPath: string;
  concurrency: number;
};

type OsuTokenResponse = {
  access_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type OsuUserResponse = {
  username?: string;
  statistics?: {
    global_rank?: number | null;
  } | null;
};

type PlayerRow = {
  username: string;
  rank: number | null;
};

const OUTPUT_HEADER = 'username\tglobal_rank_taiko';

function parseArgs(argv: string[]): CliOptions {
  let inputPath = 'players.txt';
  let outputPath = 'players.txt';
  let concurrency = 4;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--input' || arg === '-i') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --input');
      }
      inputPath = value;
      index += 1;
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --output');
      }
      outputPath = value;
      index += 1;
      continue;
    }

    if (arg === '--concurrency' || arg === '-c') {
      const value = argv[index + 1];
      const parsed = Number(value);
      if (!value || !Number.isInteger(parsed) || parsed < 1) {
        throw new Error('Invalid value for --concurrency');
      }
      concurrency = parsed;
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelpAndExit();
    }
  }

  return { inputPath, outputPath, concurrency };
}

function printHelpAndExit(): never {
  console.log(
    [
      'Usage:',
      '  pnpm --filter backend players:sort-taiko -- --input ../../players.txt --output ../../players.txt',
      '',
      'Options:',
      '  -i, --input         Input file with 1 nickname per line (default: players.txt)',
      '  -o, --output        Output file (default: players.txt)',
      '  -c, --concurrency   Parallel requests count (default: 4)',
      '  -h, --help          Show help',
    ].join('\n'),
  );

  process.exit(0);
}

function resolveFromCwd(targetPath: string): string {
  return path.resolve(process.cwd(), targetPath);
}

function loadEnvFiles(): void {
  const cwdEnv = resolveFromCwd('.env');
  if (existsSync(cwdEnv)) {
    loadEnv({ path: cwdEnv, override: false });
  }

  const backendEnv = resolveFromCwd('apps/backend/.env');
  if (existsSync(backendEnv)) {
    loadEnv({ path: backendEnv, override: false });
  }
}

async function getAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
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
    throw new Error(
      `Failed to authorize in osu API: ${payload.error ?? response.statusText}`,
    );
  }

  return payload.access_token;
}

async function fetchTaikoRank(
  token: string,
  username: string,
): Promise<number | null> {
  const encoded = encodeURIComponent(username);
  const response = await fetch(
    `https://osu.ppy.sh/api/v2/users/${encoded}/taiko?key=username`,
    {
      headers: { authorization: `Bearer ${token}` },
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch "${username}": HTTP ${response.status}`);
  }

  const payload = (await response.json()) as OsuUserResponse;
  return payload.statistics?.global_rank ?? null;
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  const result = new Array<TOutput>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      result[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return result;
}

function sortRowsByRank(rows: PlayerRow[]): PlayerRow[] {
  return [...rows].sort((left, right) => {
    if (left.rank == null && right.rank == null) {
      return left.username.localeCompare(right.username);
    }

    if (left.rank == null) {
      return 1;
    }

    if (right.rank == null) {
      return -1;
    }

    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }

    return left.username.localeCompare(right.username);
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFiles();

  const clientId = process.env.OSU_CLIENT_ID;
  const clientSecret = process.env.OSU_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'OSU_CLIENT_ID and OSU_CLIENT_SECRET are required (from .env or environment).',
    );
  }

  const absoluteInputPath = resolveFromCwd(options.inputPath);
  const absoluteOutputPath = resolveFromCwd(options.outputPath);
  const fileContent = await readFile(absoluteInputPath, 'utf8');
  const usernames = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.split('\t')[0]?.trim() ?? '')
    .filter((line) => line.toLowerCase() !== 'username')
    .filter((line) => line.length > 0);

  if (usernames.length === 0) {
    throw new Error(`Input file "${options.inputPath}" is empty.`);
  }

  const token = await getAccessToken(clientId, clientSecret);

  const rows = await mapWithConcurrency(
    usernames,
    options.concurrency,
    async (username, index) => {
      const rank = await fetchTaikoRank(token, username);
      console.log(`[${index + 1}/${usernames.length}] ${username}: ${rank ?? 'N/A'}`);
      return { username, rank };
    },
  );

  const sortedRows = sortRowsByRank(rows);
  const output = [OUTPUT_HEADER]
    .concat(sortedRows.map((row) => `${row.username}\t${row.rank ?? 'N/A'}`))
    .join('\n');

  await writeFile(absoluteOutputPath, `${output}\n`, 'utf8');
  console.log(`Saved ${sortedRows.length} rows to ${options.outputPath}`);
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error', error);
  }
  process.exit(1);
});
