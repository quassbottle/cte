import { MongoAbility } from '@casl/ability';
import { DbUser } from 'lib/infrastructure/db';
import { RequestWithAuth } from '../types';

export type AppAction = 'create' | 'read' | 'update' | 'delete' | 'manage';
export type AppSubjectName = 'Stage' | 'Tournament' | 'all';

export interface StageSubjectData {
  __type: 'Stage';
  tournamentCreatorId: string;
}

export interface TournamentSubjectData {
  __type: 'Tournament';
  creatorId?: string;
}

export type AppSubject =
  | AppSubjectName
  | StageSubjectData
  | TournamentSubjectData;
export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

export interface PolicyContext {
  subject: Exclude<AppSubjectName, 'all'>;
  subjectData: StageSubjectData | TournamentSubjectData;
}

export type PolicyHandler = (
  ability: AppAbility,
  context: PolicyContext,
) => boolean;

export type PolicyRequest = RequestWithAuth<DbUser>;

export interface PolicyContextResolver {
  supports(request: PolicyRequest): boolean;
  resolve(request: PolicyRequest): Promise<PolicyContext>;
}
