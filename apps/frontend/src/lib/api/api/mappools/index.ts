import { fetcherFactory, type TApiFetcher, type THeaders } from '$lib/api/fetcher';
import type { MappoolBeatmapDto, MappoolDto } from '$lib/api/types';

const findMany = async (
	params: { limit?: number; offset?: number } = {},
	headers: THeaders,
	fetcher: TApiFetcher<MappoolDto[]>
) => {
	const route = `/api/mappools`;
	const query = new URLSearchParams();

	if (params.limit) query.set('limit', String(params.limit));
	if (params.offset) query.set('offset', String(params.offset));

	return fetcher({ method: 'GET', route, headers, query });
};

const getById = async (id: string, headers: THeaders, fetcher: TApiFetcher<MappoolDto>) => {
	const route = `/api/mappools/${id}`;
	return fetcher({ method: 'GET', route, headers });
};

const findBeatmaps = async (
	id: string,
	headers: THeaders,
	fetcher: TApiFetcher<MappoolBeatmapDto[]>
) => {
	const route = `/api/mappools/${id}/beatmaps`;
	return fetcher({ method: 'GET', route, headers });
};

export const mappools = (headers: THeaders) => {
	const fetcher = fetcherFactory();

	return Object.freeze({
		findMany: (params?: { limit?: number; offset?: number }) =>
			findMany(params, headers, fetcher as TApiFetcher<MappoolDto[]>),
		getById: (id: string) => getById(id, headers, fetcher as TApiFetcher<MappoolDto>),
		findBeatmaps: (id: string) => findBeatmaps(id, headers, fetcher as TApiFetcher<MappoolBeatmapDto[]>)
	});
};
