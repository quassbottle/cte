export const withDndIds = <T extends { osuBeatmapId: number }>(items: T[]) =>
	items.map((item) => ({ ...item, id: item.osuBeatmapId }));

export const orderedBeatmapIds = (items: { osuBeatmapId: number }[]) =>
	items.map(({ osuBeatmapId }) => osuBeatmapId);
