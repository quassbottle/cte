import { DbMatchCreateParams } from 'lib/infrastructure/db';
import { ModesEnum } from 'osu-web.js';

export type MatchCreateParams = Omit<
  DbMatchCreateParams,
  'createdAt' | 'updatedAt' | 'id' | 'omit'
> & { mode: ModesEnum };
