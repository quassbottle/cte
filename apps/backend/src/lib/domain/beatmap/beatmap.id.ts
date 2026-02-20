import * as cuid2 from '@paralleldrive/cuid2';
import z from 'zod';

export const beatmapIdSchema = z.cuid2().brand('BeatmapId');

export type BeatmapId = z.infer<typeof beatmapIdSchema>;

const beatmapIdCuid = cuid2.init({ length: 24 });

export const beatmapId = () => beatmapIdCuid() as BeatmapId;
