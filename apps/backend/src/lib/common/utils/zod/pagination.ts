import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const paginationSchema = z.object({
  limit: z.number().min(0).default(0),
  offset: z.number().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export class PaginationDto extends createZodDto(paginationSchema) {}
