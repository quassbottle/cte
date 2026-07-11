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
