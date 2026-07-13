import z from 'zod';

export const stageTypeSchema = z.enum(['regular', 'qualification']);
export type StageType = z.infer<typeof stageTypeSchema>;
