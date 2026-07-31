import { Injectable } from '@nestjs/common';
import { stageIdSchema } from 'lib/domain/stage/stage.id';
import { createValidationPipe } from './create-validation-pipe';

@Injectable()
export class StageIdPipe extends createValidationPipe(stageIdSchema, 'stage') {}
