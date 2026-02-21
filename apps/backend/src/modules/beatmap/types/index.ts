import { beatmapIdSchema } from 'lib/domain/beatmap/beatmap.id';
import { tournamentModeSchema } from 'lib/domain/tournament/tournament.mode';
import { DbBeatmap, DbMappoolsBeatmaps } from 'lib/infrastructure/db';
import z from 'zod';

export const mappoolBeatmapViewSchema = z.object({
  beatmapId: beatmapIdSchema,
  mod: z.string(),
  index: z.number().int().positive(),
  osuBeatmapsetId: z.number().int().positive(),
  osuBeatmapId: z.number().int().positive(),
  artist: z.string(),
  title: z.string(),
  mode: tournamentModeSchema,
  difficultyName: z.string(),
  difficulty: z.number(),
  version: z.number().int(),
  deleted: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type MappoolBeatmapView = z.infer<typeof mappoolBeatmapViewSchema>;

export type BuildMappoolBeatmapViewParams = {
  mappoolBeatmap: DbMappoolsBeatmaps;
  beatmap: DbBeatmap;
};

export type FindOrCreateBeatmapParams = {
  osuBeatmapId: number;
  osuBeatmapsetId: number;
};

export type SyncBeatmapParams = {
  beatmap: DbBeatmap;
};
