import { z } from 'zod';

export const osuMatchDetailsSchema = z.object({
  match: z.object({ end_time: z.string().nullable() }),
  latest_event_id: z.number(),
  events: z.array(
    z.object({
      id: z.number(),
      game: z
        .object({
          id: z.number(),
          beatmap_id: z.number(),
          end_time: z.string().nullable(),
          scores: z.array(
            z.object({
              user_id: z.number(),
              legacy_total_score: z.number(),
              mods: z.array(z.string()),
              max_combo: z.number().int().nonnegative(),
              accuracy: z.number().min(0).max(1),
              rank: z.string(),
              statistics: z.object({
                count_300: z.number().int().nonnegative(),
                count_100: z.number().int().nonnegative(),
                count_miss: z.number().int().nonnegative(),
              }),
              match: z.object({ team: z.enum(['red', 'blue', 'none']) }),
            }),
          ),
        })
        .optional(),
    }),
  ),
});
