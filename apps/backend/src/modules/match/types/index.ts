import { DbMatchCreateParams } from 'lib/infrastructure/db';

export type MatchCreateParams = Omit<
  DbMatchCreateParams,
  'createdAt' | 'updatedAt' | 'id' | 'omit'
>;
