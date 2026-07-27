import type { QualificationStatisticsDtoOutput } from '$lib/api/generated/model';

export const sortQualificationCompetitors = (
	competitors: QualificationStatisticsDtoOutput['competitors'],
	osuBeatmapId: number | null
) =>
	[...competitors].sort((left, right) => {
		if (osuBeatmapId === null) return left.seed - right.seed;
		const leftResult = left.maps.find((map) => map.osuBeatmapId === osuBeatmapId);
		const rightResult = right.maps.find((map) => map.osuBeatmapId === osuBeatmapId);
		const leftPlace = leftResult?.gameId === null ? undefined : leftResult?.place;
		const rightPlace = rightResult?.gameId === null ? undefined : rightResult?.place;
		return (leftPlace ?? Infinity) - (rightPlace ?? Infinity) || left.seed - right.seed;
	});
