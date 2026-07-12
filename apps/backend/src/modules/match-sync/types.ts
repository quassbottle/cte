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
  matchId: string;
  osuMatchId: number;
  leaseToken: string;
  status: 'active' | 'stopped' | 'completed';
};

export type MatchSyncInput = {
  players: [
    { userId: string; osuId: number },
    { userId: string; osuId: number },
  ];
  allowedBeatmapIds: Set<number>;
};
