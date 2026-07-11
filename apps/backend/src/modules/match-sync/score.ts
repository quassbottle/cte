import { OsuMatchSnapshot } from './types';

export function calculateMatchPoints(params: {
  snapshot: OsuMatchSnapshot;
  playerOsuIds: [number, number];
  allowedBeatmapIds: ReadonlySet<number>;
}): Map<number, number> {
  const [firstPlayerId, secondPlayerId] = params.playerOsuIds;
  const points = new Map([
    [firstPlayerId, 0],
    [secondPlayerId, 0],
  ]);

  for (const game of params.snapshot.games) {
    if (!game.endedAt || !params.allowedBeatmapIds.has(game.beatmapId))
      continue;

    const firstScore = game.scores.find(
      (score) => score.userId === firstPlayerId,
    );
    const secondScore = game.scores.find(
      (score) => score.userId === secondPlayerId,
    );
    if (!firstScore || !secondScore || firstScore.score === secondScore.score)
      continue;

    const winnerId =
      firstScore.score > secondScore.score ? firstPlayerId : secondPlayerId;
    points.set(winnerId, (points.get(winnerId) ?? 0) + 1);
  }

  return points;
}
