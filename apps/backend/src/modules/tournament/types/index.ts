import { DbTournamentCreateParams } from 'lib/infrastructure/db';

export type TournamentCreateParams = Omit<
  DbTournamentCreateParams,
  'createdAt' | 'updatedAt' | 'id'
>;

export type TournamentUpdateParams = Partial<
  Pick<
    DbTournamentCreateParams,
    'name' | 'description' | 'rules' | 'startsAt' | 'endsAt'
  >
>;
