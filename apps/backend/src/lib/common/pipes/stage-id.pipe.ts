import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { StageId, stageIdSchema } from 'lib/domain/stage/stage.id';

@Injectable()
export class StageIdPipe implements PipeTransform<string, StageId> {
  public transform(value: string): StageId {
    const parsed = stageIdSchema.safeParse(value);

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => issue.message)
        .join('; ');
      throw new BadRequestException(message || 'Invalid stage id');
    }

    return parsed.data;
  }
}
