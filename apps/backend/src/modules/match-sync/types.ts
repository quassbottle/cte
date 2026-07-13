import { MatchId } from 'lib/domain/match/match.id';
import { UserId } from 'lib/domain/user/user.id';

export type OsuMatchScore = {
  userId: number;
  score: number;
  team: 'red' | 'blue' | null;
};

export type OsuMatchGame = {
  id: number;
  beatmapId: number;
  endedAt: Date | null;
  scores: OsuMatchScore[];
};

export type OsuMatchSnapshot = {
  closedAt: Date | null;
  games: OsuMatchGame[];
};

export type SyncMode = 'background' | 'manual';

export type SyncLease = {
  matchId: MatchId;
  osuMatchId: number;
  leaseToken: string;
  status: 'active' | 'stopped' | 'completed';
};

export type SoloMatchSyncInput = {
  kind: 'solo';
  players: [
    { userId: UserId; osuId: number },
    { userId: UserId; osuId: number },
  ];
  allowedBeatmapIds: Set<number>;
};

export type TeamMatchSyncInput = {
  kind: 'team';
  allowedBeatmapIds: Set<number>;
};

export type MatchSyncInput = SoloMatchSyncInput | TeamMatchSyncInput;

export type MatchSyncPoints = { redScore: number; blueScore: number };
