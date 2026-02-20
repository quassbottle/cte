import { UserId } from 'lib/domain/user/user.id';
import { DbTournamentCreateParams } from 'lib/infrastructure/db';

export type TournamentCreateParams = Omit<
  DbTournamentCreateParams,
  'createdAt' | 'updatedAt' | 'id'
>;

export type TournamentUpdateParams = Partial<
  Pick<
    DbTournamentCreateParams,
    'name' | 'description' | 'rules' | 'mode' | 'isTeam' | 'startsAt' | 'endsAt'
  >
>;

export type TournamentRegisterParams = {
  team?: {
    name: string;
    participants: UserId[];
  };
};
