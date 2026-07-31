import { Injectable } from '@nestjs/common';
import { staffRoleIdSchema } from 'lib/domain/staff-role/staff-role.id';
import { createValidationPipe } from './create-validation-pipe';

@Injectable()
export class StaffRoleIdPipe extends createValidationPipe(
  staffRoleIdSchema,
  'staff role',
) {}
