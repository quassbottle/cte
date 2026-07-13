import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { TeamId, teamIdSchema } from 'lib/domain/team/team.id';

@Injectable()
export class TeamIdPipe implements PipeTransform<string, TeamId> {
  public transform(value: string): TeamId {
    const parsed = teamIdSchema.safeParse(value);

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => issue.message)
        .join('; ');
      throw new BadRequestException(message || 'Invalid team id');
    }

    return parsed.data;
  }
}
