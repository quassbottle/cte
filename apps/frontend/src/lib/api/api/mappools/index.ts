import { fetcherFactory, type TApiFetcher, type THeaders } from '$lib/api/fetcher';
import type {
	MappoolAddBeatmapDto,
	MappoolBeatmapDto,
	MappoolCreateDto,
	MappoolDto,
	MappoolUpdateBeatmapDto
} from '$lib/api/types';

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

const create = async (
	params: MappoolCreateDto,
	headers: THeaders,
	fetcher: TApiFetcher<MappoolDto>
) => {
	const route = `/api/mappools`;
	return fetcher({ method: 'POST', route, headers, body: params });
};

const findBeatmaps = async (
	id: string,
	headers: THeaders,
	fetcher: TApiFetcher<MappoolBeatmapDto[]>
) => {
	const route = `/api/mappools/${id}/beatmaps`;
	return fetcher({ method: 'GET', route, headers });
};

const addBeatmap = async (
	id: string,
	params: MappoolAddBeatmapDto,
	headers: THeaders,
	fetcher: TApiFetcher<MappoolBeatmapDto>
) => {
	const route = `/api/mappools/${id}/beatmaps`;
	return fetcher({ method: 'POST', route, headers, body: params });
};

const updateBeatmap = async (
	id: string,
	osuBeatmapId: number,
	params: MappoolUpdateBeatmapDto,
	headers: THeaders,
	fetcher: TApiFetcher<MappoolBeatmapDto>
) => {
	const route = `/api/mappools/${id}/beatmaps/${osuBeatmapId}`;
	return fetcher({ method: 'PATCH', route, headers, body: params });
};

const deleteBeatmap = async (
	id: string,
	osuBeatmapId: number,
	headers: THeaders,
	fetcher: TApiFetcher<MappoolBeatmapDto>
) => {
	const route = `/api/mappools/${id}/beatmaps/${osuBeatmapId}`;
	return fetcher({ method: 'DELETE', route, headers });
};

export const mappools = (headers: THeaders) => {
	const fetcher = fetcherFactory();

	return Object.freeze({
		findMany: (params?: { limit?: number; offset?: number }) =>
			findMany(params, headers, fetcher as TApiFetcher<MappoolDto[]>),
		getById: (id: string) => getById(id, headers, fetcher as TApiFetcher<MappoolDto>),
		create: (params: MappoolCreateDto) => create(params, headers, fetcher as TApiFetcher<MappoolDto>),
		findBeatmaps: (id: string) => findBeatmaps(id, headers, fetcher as TApiFetcher<MappoolBeatmapDto[]>),
		addBeatmap: (id: string, params: MappoolAddBeatmapDto) =>
			addBeatmap(id, params, headers, fetcher as TApiFetcher<MappoolBeatmapDto>),
		updateBeatmap: (id: string, osuBeatmapId: number, params: MappoolUpdateBeatmapDto) =>
			updateBeatmap(id, osuBeatmapId, params, headers, fetcher as TApiFetcher<MappoolBeatmapDto>),
		deleteBeatmap: (id: string, osuBeatmapId: number) =>
			deleteBeatmap(id, osuBeatmapId, headers, fetcher as TApiFetcher<MappoolBeatmapDto>)
	});
};
