export type MatchPoints = { redScore: number; blueScore: number };

type Team = 'red' | 'blue';

type MatchHistoryScore = {
  userId: string | null;
  team: Team | null;
  score: number;
};

export function orderMatchHistoryScores<T extends MatchHistoryScore>(
  scores: readonly T[],
  teamIds: Record<Team, string> | null,
) {
  if (!teamIds) {
    const highestScore = Math.max(...scores.map(({ score }) => score));

    return [...scores]
      .sort((a, b) => b.score - a.score)
      .map((score) => ({
        ...score,
        competitorId: score.userId,
        highlighted: score.score === highestScore,
      }));
  }

  const totals: Record<Team, number> = { red: 0, blue: 0 };
  for (const score of scores) {
    if (score.team) totals[score.team] += score.score;
  }
  const highestTotal = Math.max(totals.red, totals.blue);
  const teamOrder: Team[] =
    totals.red >= totals.blue ? ['red', 'blue'] : ['blue', 'red'];

  return [...scores]
    .sort((a, b) => {
      if (a.team === b.team) return b.score - a.score;
      return (
        (a.team ? teamOrder.indexOf(a.team) : 2) -
        (b.team ? teamOrder.indexOf(b.team) : 2)
      );
    })
    .map((score) => ({
      ...score,
      competitorId: score.team ? teamIds[score.team] : score.userId,
      highlighted: score.team !== null && totals[score.team] === highestTotal,
    }));
}

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
        ? params.playerOsuIds.map(
            (userId) =>
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
