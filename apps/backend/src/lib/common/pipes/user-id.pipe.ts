import { Injectable } from '@nestjs/common';
import { userIdSchema } from 'lib/domain/user/user.id';
import { createValidationPipe } from './create-validation-pipe';

@Injectable()
export class UserIdPipe extends createValidationPipe(userIdSchema, 'user') {}
