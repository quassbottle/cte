import { DbMatchCreateParams } from 'lib/infrastructure/db';
import { ScheduleMatchUpsertInput } from '../dto';

export type MatchCreateParams = Omit<
  DbMatchCreateParams,
  'createdAt' | 'updatedAt' | 'id' | 'omit'
>;

export type ScheduleMatchCreateParams = ScheduleMatchUpsertInput & {
  creatorId: DbMatchCreateParams['creatorId'];
};
