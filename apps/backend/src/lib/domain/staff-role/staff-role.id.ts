import * as cuid2 from '@paralleldrive/cuid2';
import z from 'zod';

export const staffRoleIdSchema = z.cuid2().brand('StaffRoleId');

export type StaffRoleId = z.infer<typeof staffRoleIdSchema>;

const staffRoleIdCuid = cuid2.init({ length: 24 });

export const staffRoleId = () => staffRoleIdCuid() as StaffRoleId;
