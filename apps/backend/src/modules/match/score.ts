export type MatchPoints = { redScore: number; blueScore: number };

type Snapshot = {
  games: {
    beatmapId: number;
    endedAt: Date | null;
    scores: { userId: number; score: number; team: 'red' | 'blue' | null }[];
  }[];
};

type CalculateMatchPointsParams =
  | {
      kind: 'solo';
      snapshot: Snapshot;
      playerOsuIds: [number, number];
      allowedBeatmapIds: ReadonlySet<number>;
    }
  | {
      kind: 'team';
      snapshot: Snapshot;
      allowedBeatmapIds: ReadonlySet<number>;
    };

export function calculateMatchPoints(
  params: CalculateMatchPointsParams,
): MatchPoints {
  const points: MatchPoints = { redScore: 0, blueScore: 0 };

  for (const game of params.snapshot.games) {
    if (!game.endedAt || !params.allowedBeatmapIds.has(game.beatmapId))
      continue;

    const [redScore, blueScore] =
      params.kind === 'solo'
        ? params.playerOsuIds.map((userId) =>
            game.scores.find((score) => score.userId === userId)?.score,
          )
        : ['red', 'blue'].map((team) => {
            const scores = game.scores.filter((score) => score.team === team);
            return scores.length
              ? scores.reduce((total, score) => total + score.score, 0)
              : undefined;
          });
    if (
      redScore === undefined ||
      blueScore === undefined ||
      redScore === blueScore
    )
      continue;

    if (redScore > blueScore) points.redScore += 1;
    else points.blueScore += 1;
  }

  return points;
}
