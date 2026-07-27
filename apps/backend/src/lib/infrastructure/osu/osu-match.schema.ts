import { z } from 'zod';

const modSchema = z.codec(z.object({ acronym: z.string() }), z.string(), {
  decode: ({ acronym }) => acronym,
  encode: (acronym) => ({ acronym }),
});

const statistic = z.number().int().nonnegative().default(0);
const normalizedStatistic = z.number().int().nonnegative();

const teamSchema = z.codec(
  z.enum(['red', 'blue', 'none']),
  z.enum(['red', 'blue']).nullable(),
  {
    decode: (team) => (team === 'none' ? null : team),
    encode: (team) => team ?? 'none',
  },
);

const rawScoreSchema = z.object({
  user_id: z.number(),
  legacy_total_score: z.number(),
  mods: z.array(modSchema),
  max_combo: z.number().int().nonnegative(),
  accuracy: z.number().min(0).max(1),
  rank: z.string(),
  statistics: z.object({
    great: statistic,
    ok: statistic,
    miss: statistic,
  }),
  match: z.object({ team: teamSchema }),
});

const normalizedScoreSchema = z.object({
  user_id: z.number(),
  legacy_total_score: z.number(),
  mods: z.array(z.string()),
  max_combo: z.number().int().nonnegative(),
  accuracy: z.number().min(0).max(1),
  rank: z.string(),
  statistics: z.object({
    great: normalizedStatistic,
    ok: normalizedStatistic,
    miss: normalizedStatistic,
  }),
  team: z.enum(['red', 'blue']).nullable(),
});

const scoreSchema = z.codec(rawScoreSchema, normalizedScoreSchema, {
  decode: ({ match, ...score }) => ({ ...score, team: match.team }),
  encode: ({ team, ...score }) => ({ ...score, match: { team } }),
});

const rawGameSchema = z.object({
  id: z.number(),
  beatmap_id: z.number(),
  end_time: z.string().nullable(),
  mods: z.array(modSchema),
  scores: z.array(scoreSchema),
});

const normalizedGameSchema = z.object({
  id: z.number(),
  beatmap_id: z.number(),
  end_time: z.string().nullable(),
  scores: z.array(normalizedScoreSchema),
});

const gameSchema = z.codec(rawGameSchema, normalizedGameSchema, {
  decode: ({ mods, scores, ...game }) => ({
    ...game,
    scores: scores.map((score) => ({
      ...score,
      mods: [...new Set([...mods, ...score.mods])],
    })),
  }),
  encode: (game) => ({ ...game, mods: [] }),
});

export const osuMatchDetailsSchema = z.object({
  match: z.object({ end_time: z.string().nullable() }),
  latest_event_id: z.number(),
  events: z.array(
    z.object({
      id: z.number(),
      game: gameSchema.optional(),
    }),
  ),
});
