import { Injectable } from '@nestjs/common';
import { teamIdSchema } from 'lib/domain/team/team.id';
import { createValidationPipe } from './create-validation-pipe';

@Injectable()
export class TeamIdPipe extends createValidationPipe(teamIdSchema, 'team') {}
