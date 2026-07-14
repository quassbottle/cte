import { MatchSyncPoints, OsuMatchSnapshot } from './types';

type CalculateMatchPointsParams =
  | {
      kind: 'solo';
      snapshot: OsuMatchSnapshot;
      playerOsuIds: [number, number];
      allowedBeatmapIds: ReadonlySet<number>;
    }
  | {
      kind: 'team';
      snapshot: OsuMatchSnapshot;
      allowedBeatmapIds: ReadonlySet<number>;
    };

export function calculateMatchPoints(params: CalculateMatchPointsParams): MatchSyncPoints {
  const points: MatchSyncPoints = { redScore: 0, blueScore: 0 };

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
    if (redScore === undefined || blueScore === undefined || redScore === blueScore)
      continue;

    if (redScore > blueScore) points.redScore += 1;
    else points.blueScore += 1;
  }

  return points;
}
