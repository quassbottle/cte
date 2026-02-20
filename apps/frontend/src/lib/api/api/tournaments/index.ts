import { fetcherFactory, type TApiFetcher, type THeaders } from '$lib/api/fetcher';
import type { TournamentCreateDto, TournamentDto, UserDto } from '$lib/api/types';

const findMany = async (
	params: { limit?: number; offset?: number },
	headers: THeaders,
	fetcher: TApiFetcher<TournamentDto[]>
) => {
	const route = `/api/tournaments/`;
	const query = new URLSearchParams();

	if (params.limit) query.set('limit', String(params.limit));
	if (params.offset) query.set('offset', String(params.offset));

	return fetcher({ method: 'GET', route, headers, query });
};

const getById = async (id: string, headers: THeaders, fetcher: TApiFetcher<TournamentDto>) => {
	const route = `/api/tournaments/${id}`;
	return fetcher({ method: 'GET', route, headers });
};

const register = async (id: string, headers: THeaders, fetcher: TApiFetcher<TournamentDto>) => {
	const route = `/api/tournaments/${id}/register`;
	return fetcher({ method: 'POST', route, headers });
};

const unregister = async (id: string, headers: THeaders, fetcher: TApiFetcher<TournamentDto>) => {
	const route = `/api/tournaments/${id}/unregister`;
	return fetcher({ method: 'POST', route, headers });
};

const participants = async (id: string, headers: THeaders, fetcher: TApiFetcher<UserDto[]>) => {
	const route = `/api/tournaments/${id}/participants`;
	return fetcher({ method: 'GET', route, headers });
};

const create = async (
	params: TournamentCreateDto,
	headers: THeaders,
	fetcher: TApiFetcher<TournamentDto>
) => {
	const route = `/api/tournaments`;
	return fetcher({ method: 'POST', route, headers, body: params });
};

export const tournaments = (headers: THeaders) => {
	const fetcher = fetcherFactory();

	return Object.freeze({
		getById: (id: string) => getById(id, headers, fetcher as TApiFetcher<TournamentDto>),
		register: (id: string) => register(id, headers, fetcher as TApiFetcher<TournamentDto>),
		unregister: (id: string) => unregister(id, headers, fetcher as TApiFetcher<TournamentDto>),
		participants: (id: string) => participants(id, headers, fetcher as TApiFetcher<UserDto[]>),
		findMany: (params: { limit?: number; offset?: number }) =>
			findMany(params, headers, fetcher as TApiFetcher<TournamentDto[]>),
		create: (params: TournamentCreateDto) =>
			create(params, headers, fetcher as TApiFetcher<TournamentDto>)
	});
};
