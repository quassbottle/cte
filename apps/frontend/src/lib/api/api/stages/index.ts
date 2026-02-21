import { fetcherFactory, type TApiFetcher, type THeaders } from '$lib/api/fetcher';
import type { StageCreateDto, StageDto } from '$lib/api/types';

const findMany = async (
	tournamentId: string,
	params: { limit?: number; offset?: number } = {},
	headers: THeaders,
	fetcher: TApiFetcher<StageDto[]>
) => {
	const route = `/api/tournaments/${tournamentId}/stages`;
	const query = new URLSearchParams();

	if (params.limit) query.set('limit', String(params.limit));
	if (params.offset) query.set('offset', String(params.offset));

	return fetcher({ method: 'GET', route, headers, query });
};

const create = async (
	tournamentId: string,
	params: StageCreateDto,
	headers: THeaders,
	fetcher: TApiFetcher<StageDto>
) => {
	const route = `/api/tournaments/${tournamentId}/stages`;
	return fetcher({ method: 'POST', route, headers, body: params });
};

export const stages = (headers: THeaders) => {
	const fetcher = fetcherFactory();

	return Object.freeze({
		findMany: (tournamentId: string, params?: { limit?: number; offset?: number }) =>
			findMany(tournamentId, params, headers, fetcher as TApiFetcher<StageDto[]>),
		create: (tournamentId: string, params: StageCreateDto) =>
			create(tournamentId, params, headers, fetcher as TApiFetcher<StageDto>)
	});
};
