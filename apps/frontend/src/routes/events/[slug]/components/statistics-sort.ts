export const statisticsSortHref = (url: URL, beatmapId: number | null) => {
	const params = new URLSearchParams(url.searchParams);
	const currentBeatmapId = Number(params.get('sortBeatmapId')) || null;
	const currentDirection = params.get('sortDirection') === 'desc' ? 'desc' : 'asc';
	const direction =
		currentBeatmapId === beatmapId
			? currentDirection === 'asc'
				? 'desc'
				: 'asc'
			: beatmapId === null
				? 'asc'
				: 'desc';

	params.set('tab', 'statistics');
	if (beatmapId === null) params.delete('sortBeatmapId');
	else params.set('sortBeatmapId', String(beatmapId));
	params.set('sortDirection', direction);

	return `${url.pathname}?${params}`;
};

export const statisticsViewHref = (url: URL, view: 'teams' | 'players', stageId: string) => {
	const params = new URLSearchParams(url.searchParams);
	params.set('tab', 'statistics');
	params.set('stage', stageId);
	if (view === 'players') params.set('view', 'players');
	else params.delete('view');
	params.delete('sortBeatmapId');
	params.delete('sortDirection');
	return `${url.pathname}?${params}`;
};
