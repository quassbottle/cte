import { fetcherFactory, type TApiFetcher, type THeaders } from '$lib/api/fetcher';
import type { OsuBeatmapMetadataDto } from '$lib/api/types';

const getBeatmap = async (
	beatmapId: number,
	headers: THeaders,
	fetcher: TApiFetcher<OsuBeatmapMetadataDto>
) => {
	const route = `/api/osu/beatmaps/${beatmapId}`;
	return fetcher({ method: 'GET', route, headers });
};

export const osu = (headers: THeaders) => {
	const fetcher = fetcherFactory();

	return Object.freeze({
		getBeatmap: (beatmapId: number) =>
			getBeatmap(beatmapId, headers, fetcher as TApiFetcher<OsuBeatmapMetadataDto>)
	});
};
