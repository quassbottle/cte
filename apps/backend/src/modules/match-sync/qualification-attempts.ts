import { OsuMatchSnapshot, QualificationAttemptInput } from './types';

export function extractQualificationAttempts(
  snapshot: OsuMatchSnapshot,
  allowedBeatmapIds: ReadonlySet<number>,
): QualificationAttemptInput[] {
  return snapshot.games.flatMap((game) =>
    game.endedAt && allowedBeatmapIds.has(game.beatmapId)
      ? game.scores.map(({ userId, score }) => ({
          osuGameId: game.id,
          osuBeatmapId: game.beatmapId,
          osuUserId: userId,
          score,
        }))
      : [],
  );
}
