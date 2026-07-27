export type QualificationCompetitor<CompetitorId extends string = string> = {
  id: CompetitorId;
  tieBreakId: string | number;
  userIds: readonly string[];
};

export type QualificationAttempt = {
  osuGameId: number;
  beatmapId: string;
  userId: string;
  score: number;
};

export type QualificationSeedingInput<CompetitorId extends string = string> = {
  beatmapIds: readonly string[];
  competitors: readonly QualificationCompetitor<CompetitorId>[];
  attempts: readonly QualificationAttempt[];
};

export type CalculatedSeed<CompetitorId extends string = string> = {
  competitorId: CompetitorId;
  seed: number;
  averagePlace: number;
  totalScore: number;
  maps: {
    beatmapId: string;
    osuGameId: number | null;
    score: number;
    place: number;
  }[];
};

const compareTieBreak = (left: string | number, right: string | number) =>
  typeof left === 'number' && typeof right === 'number'
    ? left - right
    : String(left).localeCompare(String(right));

export function calculateQualificationSeeds<CompetitorId extends string>({
  beatmapIds,
  competitors,
  attempts,
}: QualificationSeedingInput<CompetitorId>): CalculatedSeed<CompetitorId>[] {
  const rows = competitors.map((competitor) => {
    const members = new Set(competitor.userIds);
    const gameTotalsByMap = new Map<string, Map<number, number>>();

    for (const attempt of attempts) {
      if (!members.has(attempt.userId)) continue;
      const gameTotals =
        gameTotalsByMap.get(attempt.beatmapId) ?? new Map<number, number>();
      gameTotals.set(
        attempt.osuGameId,
        (gameTotals.get(attempt.osuGameId) ?? 0) + attempt.score,
      );
      gameTotalsByMap.set(attempt.beatmapId, gameTotals);
    }

    return {
      competitor,
      maps: beatmapIds.map((beatmapId) => {
        const games = [...(gameTotalsByMap.get(beatmapId) ?? [])];
        const best = games.reduce<[number, number] | undefined>(
          (current, game) =>
            !current ||
            game[1] > current[1] ||
            (game[1] === current[1] && game[0] < current[0])
              ? game
              : current,
          undefined,
        );
        return {
          beatmapId,
          osuGameId: best?.[0] ?? null,
          score: best?.[1] ?? 0,
          place: 0,
        };
      }),
      placeSum: 0,
      totalScore: 0,
    };
  });

  for (const [mapIndex] of beatmapIds.entries()) {
    const mapRows = [...rows].sort(
      (left, right) => right.maps[mapIndex].score - left.maps[mapIndex].score,
    );
    let place = 1;

    mapRows.forEach((row, index) => {
      if (
        index > 0 &&
        row.maps[mapIndex].score !== mapRows[index - 1].maps[mapIndex].score
      ) {
        place = index + 1;
      }
      row.maps[mapIndex].place = place;
      row.placeSum += place;
      row.totalScore += row.maps[mapIndex].score;
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
      maps: row.maps,
    }));
}
