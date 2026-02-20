import z from 'zod';

export const userRoleSchema = z.enum(['default', 'admin']);

export type UserRole = z.infer<typeof userRoleSchema>;
