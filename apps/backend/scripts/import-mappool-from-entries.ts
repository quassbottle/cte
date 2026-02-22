import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MappoolService } from '../src/modules/mappool/mappool.service';

type ParsedEntry = {
  line: number;
  mod: string;
  index: number;
  osuBeatmapsetId: number;
  osuBeatmapId: number;
};

type CliArgs = {
  mappoolId: string;
  filePath: string;
  dryRun: boolean;
};

const parseArgs = (): CliArgs => {
  const argv = process.argv.slice(2);
  let mappoolId = '';
  let filePath = '';
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mappool-id' && argv[i + 1]) {
      mappoolId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--mappool-id=')) {
      mappoolId = arg.slice('--mappool-id='.length);
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
    if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  if (!mappoolId.trim()) {
    throw new Error(
      'Missing --mappool-id. Example: --mappool-id=cmah2z0ot00058o0f2uoqivx7',
    );
  }

  return {
    mappoolId: mappoolId.trim(),
    filePath: filePath || resolveDefaultFilePath(),
    dryRun,
  };
};

const resolveDefaultFilePath = (): string => {
  const candidates = ['../../entries.txt', '../../entires.txt'];
  for (const candidate of candidates) {
    if (existsSync(resolve(process.cwd(), candidate))) {
      return candidate;
    }
  }
  return '../../entries.txt';
};

const parseEntry = (line: string, lineNumber: number): ParsedEntry => {
  const trimmed = line.trim();
  if (!trimmed) {
    throw new Error(`Line ${lineNumber}: empty line is not allowed`);
  }

  const [slot, url] = trimmed.split(/\s+/, 2);
  if (!slot || !url) {
    throw new Error(
      `Line ${lineNumber}: expected "<MOD><INDEX> <osu_url>", got "${trimmed}"`,
    );
  }

  const slotMatch = /^([a-zA-Z]+)(\d+)$/.exec(slot);
  if (!slotMatch) {
    throw new Error(
      `Line ${lineNumber}: invalid slot "${slot}", expected like NM1/HD2/TB3`,
    );
  }

  const urlMatch =
    /beatmapsets\/(\d+)(?:#[a-zA-Z0-9_-]+\/(\d+))/.exec(url) ??
    /beatmaps\/(\d+)/.exec(url);

  if (!urlMatch) {
    throw new Error(
      `Line ${lineNumber}: invalid osu url "${url}", expected beatmapsets/...#mode/beatmapId`,
    );
  }

  let osuBeatmapsetId = 0;
  let osuBeatmapId = 0;

  if (url.includes('beatmapsets/')) {
    osuBeatmapsetId = Number.parseInt(urlMatch[1], 10);
    osuBeatmapId = Number.parseInt(urlMatch[2], 10);
  } else {
    osuBeatmapId = Number.parseInt(urlMatch[1], 10);
  }

  if (!Number.isInteger(osuBeatmapId) || osuBeatmapId <= 0) {
    throw new Error(`Line ${lineNumber}: invalid beatmap id in url "${url}"`);
  }
  if (!Number.isInteger(osuBeatmapsetId) || osuBeatmapsetId <= 0) {
    throw new Error(
      `Line ${lineNumber}: beatmapset id is required in url "${url}"`,
    );
  }

  return {
    line: lineNumber,
    mod: slotMatch[1].toUpperCase(),
    index: Number.parseInt(slotMatch[2], 10),
    osuBeatmapsetId,
    osuBeatmapId,
  };
};

const loadEntries = (filePath: string): ParsedEntry[] => {
  const absolute = resolve(process.cwd(), filePath);
  const raw = readFileSync(absolute, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter((line) => line.line.length > 0);

  return lines.map((line) => parseEntry(line.line, line.lineNumber));
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const main = async () => {
  const args = parseArgs();
  const entries = loadEntries(args.filePath);

  console.log(
    `[import] parsed ${entries.length} entries from ${resolve(process.cwd(), args.filePath)}`,
  );
  console.log(`[import] target mappoolId: ${args.mappoolId}`);
  if (args.dryRun) {
    console.log('[import] dry-run enabled, no database changes will be made');
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  let added = 0;
  let updated = 0;
  let failed = 0;

  try {
    const mappoolService = app.get(MappoolService);

    for (const entry of entries) {
      try {
        await mappoolService.addBeatmap({
          id: args.mappoolId as never,
          mod: entry.mod,
          osuBeatmapsetId: entry.osuBeatmapsetId,
          osuBeatmapId: entry.osuBeatmapId,
        });
        await mappoolService.updateBeatmap({
          id: args.mappoolId as never,
          osuBeatmapId: entry.osuBeatmapId,
          mod: entry.mod,
          index: entry.index,
        });
        added += 1;
        console.log(
          `[add] ${entry.mod}${entry.index} -> ${entry.osuBeatmapsetId}/${entry.osuBeatmapId}`,
        );
      } catch (error) {
        const message = getErrorMessage(error);

        if (message.toLowerCase().includes('already in mappool')) {
          try {
            await mappoolService.updateBeatmap({
              id: args.mappoolId as never,
              osuBeatmapId: entry.osuBeatmapId,
              mod: entry.mod,
              index: entry.index,
            });
            updated += 1;
            console.log(
              `[update] ${entry.mod}${entry.index} -> ${entry.osuBeatmapsetId}/${entry.osuBeatmapId}`,
            );
            continue;
          } catch (updateError) {
            failed += 1;
            console.error(
              `[fail] line ${entry.line}: ${entry.mod}${entry.index} (${entry.osuBeatmapId}) -> ${getErrorMessage(updateError)}`,
            );
            continue;
          }
        }

        failed += 1;
        console.error(
          `[fail] line ${entry.line}: ${entry.mod}${entry.index} (${entry.osuBeatmapId}) -> ${message}`,
        );
      }
    }
  } finally {
    await app.close();
  }

  console.log('');
  console.log('[import] done');
  console.log(`[import] added: ${added}`);
  console.log(`[import] updated existing: ${updated}`);
  console.log(`[import] failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

void main();
