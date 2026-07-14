export type QualificationCompetitor = {
  id: string;
  tieBreakId: string | number;
  userIds: readonly string[];
};

export type QualificationAttempt = {
  osuGameId: number;
  beatmapId: string;
  userId: string;
  score: number;
};

export type QualificationSeedingInput = {
  beatmapIds: readonly string[];
  competitors: readonly QualificationCompetitor[];
  attempts: readonly QualificationAttempt[];
};

export type CalculatedSeed = {
  competitorId: string;
  seed: number;
  averagePlace: number;
  totalScore: number;
};

const compareTieBreak = (left: string | number, right: string | number) =>
  typeof left === 'number' && typeof right === 'number'
    ? left - right
    : String(left).localeCompare(String(right));

export function calculateQualificationSeeds({
  beatmapIds,
  competitors,
  attempts,
}: QualificationSeedingInput): CalculatedSeed[] {
  const rows = competitors.map((competitor) => {
    const members = new Set(competitor.userIds);
    const gameTotalsByMap = new Map<string, Map<number, number>>();

    for (const attempt of attempts) {
      if (!members.has(attempt.userId)) continue;
      const gameTotals = gameTotalsByMap.get(attempt.beatmapId) ?? new Map();
      gameTotals.set(
        attempt.osuGameId,
        (gameTotals.get(attempt.osuGameId) ?? 0) + attempt.score,
      );
      gameTotalsByMap.set(attempt.beatmapId, gameTotals);
    }

    const bestByMap = new Map(beatmapIds.map((id) => [id, 0]));
    for (const [beatmapId, gameTotals] of gameTotalsByMap) {
      bestByMap.set(beatmapId, Math.max(...gameTotals.values()));
    }

    return {
      competitor,
      scores: beatmapIds.map((id) => bestByMap.get(id) ?? 0),
      placeSum: 0,
      totalScore: 0,
    };
  });

  for (const [mapIndex] of beatmapIds.entries()) {
    const mapRows = [...rows].sort(
      (left, right) => right.scores[mapIndex] - left.scores[mapIndex],
    );
    let place = 1;

    mapRows.forEach((row, index) => {
      if (
        index > 0 &&
        row.scores[mapIndex] !== mapRows[index - 1].scores[mapIndex]
      ) {
        place = index + 1;
      }
      row.placeSum += place;
      row.totalScore += row.scores[mapIndex];
    });
  }

  return rows
    .sort(
      (left, right) =>
        left.placeSum - right.placeSum ||
        right.totalScore - left.totalScore ||
        compareTieBreak(
          left.competitor.tieBreakId,
          right.competitor.tieBreakId,
        ),
    )
    .map((row, index) => ({
      competitorId: row.competitor.id,
      seed: index + 1,
      averagePlace: row.placeSum / beatmapIds.length,
      totalScore: row.totalScore,
    }));
}
