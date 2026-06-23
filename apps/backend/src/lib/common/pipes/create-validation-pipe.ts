import { BadRequestException, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

export function createValidationPipe<T>(
  schema: z.ZodType<T>,
  entityName?: string,
) {
  return class implements PipeTransform<string, T> {
    transform(value: string): T {
      const parsed = schema.safeParse(value);

      if (!parsed.success) {
        const message = parsed.error.issues
          .map((issue) => issue.message)
          .join('; ');
        throw new BadRequestException(
          message ||
            (entityName ? `Invalid ${entityName} id` : 'Invalid value'),
        );
      }

      return parsed.data;
    }
  };
}
