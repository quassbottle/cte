import * as cuid2 from '@paralleldrive/cuid2';
import z from 'zod';

export const stageIdSchema = z.cuid2().brand('StageId');

export type StageId = z.infer<typeof stageIdSchema>;

const stageIdCuid = cuid2.init({ length: 24 });

export const stageId = () => stageIdCuid() as StageId;
