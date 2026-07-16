import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { StaffRoleId, staffRoleIdSchema } from 'lib/domain/staff-role/staff-role.id';

@Injectable()
export class StaffRoleIdPipe implements PipeTransform<string, StaffRoleId> {
  public transform(value: string): StaffRoleId {
    const parsed = staffRoleIdSchema.safeParse(value);
    if (!parsed.success) throw new BadRequestException('Invalid staff role id');
    return parsed.data;
  }
}
