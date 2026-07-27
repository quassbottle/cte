import { z } from 'zod';

const modSchema = z
  .object({ acronym: z.string() })
  .transform(({ acronym }) => acronym);
const statistic = z.number().int().nonnegative().default(0);
const teamSchema = z
  .enum(['red', 'blue', 'none'])
  .transform((team) => (team === 'none' ? null : team));

const scoreSchema = z
  .object({
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
  })
  .transform(
    ({
      user_id,
      legacy_total_score,
      max_combo,
      statistics,
      match,
      ...score
    }) => ({
      ...score,
      userId: user_id,
      score: legacy_total_score,
      maxCombo: max_combo,
      great: statistics.great,
      ok: statistics.ok,
      miss: statistics.miss,
      team: match.team,
    }),
  );

const gameSchema = z
  .object({
    id: z.number(),
    beatmap_id: z.number(),
    end_time: z.string().nullable(),
    mods: z.array(modSchema),
    scores: z.array(scoreSchema),
  })
  .transform(({ mods, scores, ...game }) => ({
    ...game,
    scores: scores.map((score) => ({
      ...score,
      mods: [...new Set([...mods, ...score.mods])],
    })),
  }));

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
