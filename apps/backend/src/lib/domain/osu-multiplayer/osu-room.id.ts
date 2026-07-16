import * as cuid2 from '@paralleldrive/cuid2';
import z from 'zod';

export const osuRoomIdSchema = z.cuid2().brand('OsuRoomId');

export type OsuRoomId = z.infer<typeof osuRoomIdSchema>;

const cuid = cuid2.init({ length: 24 });

export const osuRoomId = () => cuid() as OsuRoomId;
