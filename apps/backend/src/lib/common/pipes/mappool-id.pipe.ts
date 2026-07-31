import { Injectable } from '@nestjs/common';
import { mappoolIdSchema } from 'lib/domain/mappool/mappool.id';
import { createValidationPipe } from './create-validation-pipe';

@Injectable()
export class MappoolIdPipe extends createValidationPipe(
  mappoolIdSchema,
  'mappool',
) {}
