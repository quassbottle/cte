import { fetcherFactory, type TApiFetcher, type THeaders } from '$lib/api/fetcher';
import type { StageCreateDto, StageDto } from '$lib/api/types';

const findMany = async (
	params: { limit?: number; offset?: number } = {},
	headers: THeaders,
	fetcher: TApiFetcher<StageDto[]>
) => {
	const route = `/api/stages`;
	const query = new URLSearchParams();

	if (params.limit) query.set('limit', String(params.limit));
	if (params.offset) query.set('offset', String(params.offset));

	return fetcher({ method: 'GET', route, headers, query });
};

const create = async (params: StageCreateDto, headers: THeaders, fetcher: TApiFetcher<StageDto>) => {
	const route = `/api/stages`;
	return fetcher({ method: 'POST', route, headers, body: params });
};

export const stages = (headers: THeaders) => {
	const fetcher = fetcherFactory();

	return Object.freeze({
		findMany: (params?: { limit?: number; offset?: number }) =>
			findMany(params, headers, fetcher as TApiFetcher<StageDto[]>),
		create: (params: StageCreateDto) => create(params, headers, fetcher as TApiFetcher<StageDto>)
	});
};
