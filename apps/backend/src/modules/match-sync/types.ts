import { MatchId } from 'lib/domain/match/match.id';
import { UserId } from 'lib/domain/user/user.id';

export type OsuMatchScore = { userId: number; score: number };

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

export type MatchSyncInput = {
  players: [
    { userId: UserId; osuId: number },
    { userId: UserId; osuId: number },
  ];
  allowedBeatmapIds: Set<number>;
};
