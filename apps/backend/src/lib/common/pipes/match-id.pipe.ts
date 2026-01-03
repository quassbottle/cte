import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { MatchId, matchIdSchema } from 'lib/domain/match/match.id';

@Injectable()
export class MatchIdPipe implements PipeTransform<string, MatchId> {
  public transform(value: string): MatchId {
    const parsed = matchIdSchema.safeParse(value);

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => issue.message)
        .join('; ');
      throw new BadRequestException(message || 'Invalid match id');
    }

    return parsed.data;
  }
}
