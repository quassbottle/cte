import * as cuid2 from '@paralleldrive/cuid2';
import z from 'zod';

export const mappoolIdSchema = z.cuid2().brand('MappoolId');

export type MappoolId = z.infer<typeof mappoolIdSchema>;

const mappoolIdCuid = cuid2.init({ length: 24 });

export const mappoolId = () => mappoolIdCuid() as MappoolId;
