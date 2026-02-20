import { DbMappoolCreateParams } from 'lib/infrastructure/db';

export type MappoolCreateParams = Omit<
  DbMappoolCreateParams,
  'createdAt' | 'updatedAt' | 'id'
>;

export type MappoolUpdateParams = Partial<
  Pick<DbMappoolCreateParams, 'startsAt' | 'endsAt'>
>;
