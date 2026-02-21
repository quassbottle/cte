import { DbStageCreateParams } from 'lib/infrastructure/db';

export type StageCreateParams = Omit<
  DbStageCreateParams,
  'createdAt' | 'updatedAt' | 'id'
>;

export type StageUpdateParams = Partial<
  Pick<DbStageCreateParams, 'name' | 'startsAt' | 'endsAt'>
>;
