import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { MappoolId, mappoolIdSchema } from 'lib/domain/mappool/mappool.id';

@Injectable()
export class MappoolIdPipe implements PipeTransform<string, MappoolId> {
  public transform(value: string): MappoolId {
    const parsed = mappoolIdSchema.safeParse(value);

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => issue.message)
        .join('; ');
      throw new BadRequestException(message || 'Invalid mappool id');
    }

    return parsed.data;
  }
}
