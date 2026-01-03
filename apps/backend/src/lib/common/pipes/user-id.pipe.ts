import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { UserId, userIdSchema } from 'lib/domain/user/user.id';

@Injectable()
export class UserIdPipe implements PipeTransform<string, UserId> {
  public transform(value: string): UserId {
    const parsed = userIdSchema.safeParse(value);

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => issue.message)
        .join('; ');
      throw new BadRequestException(message || 'Invalid user id');
    }

    return parsed.data;
  }
}
