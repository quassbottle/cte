import { fetcherFactory, type TApiFetcher, type THeaders } from '$lib/api/fetcher';
import type {
	RegisterTournamentDto,
	TournamentCreateDto,
	TournamentDto,
	TournamentParticipantDto,
	TournamentUpdateDto
} from '$lib/api/types';

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

const register = async (
	id: string,
	body: RegisterTournamentDto | undefined,
	headers: THeaders,
	fetcher: TApiFetcher<void>
) => {
	const route = `/api/tournaments/${id}/register`;
	return fetcher({ method: 'POST', route, headers, body });
};

const unregister = async (id: string, headers: THeaders, fetcher: TApiFetcher<void>) => {
	const route = `/api/tournaments/${id}/register`;
	return fetcher({ method: 'DELETE', route, headers });
};

const participants = async (
	id: string,
	params: { limit?: number; offset?: number } = {},
	headers: THeaders,
	fetcher: TApiFetcher<TournamentParticipantDto[]>
) => {
	const route = `/api/tournaments/${id}/participants`;
	const query = new URLSearchParams();

	if (params.limit) query.set('limit', String(params.limit));
	if (params.offset) query.set('offset', String(params.offset));

	return fetcher({ method: 'GET', route, headers, query });
};

const create = async (
	params: TournamentCreateDto,
	headers: THeaders,
	fetcher: TApiFetcher<TournamentDto>
) => {
	const route = `/api/tournaments`;
	return fetcher({ method: 'POST', route, headers, body: params });
};

const update = async (
	id: string,
	params: TournamentUpdateDto,
	headers: THeaders,
	fetcher: TApiFetcher<TournamentDto>
) => {
	const route = `/api/tournaments/${id}`;
	return fetcher({ method: 'PATCH', route, headers, body: params });
};

export const tournaments = (headers: THeaders) => {
	const fetcher = fetcherFactory();

	return Object.freeze({
		getById: (id: string) => getById(id, headers, fetcher as TApiFetcher<TournamentDto>),
		register: (id: string, body?: RegisterTournamentDto) =>
			register(id, body, headers, fetcher as TApiFetcher<void>),
		unregister: (id: string) => unregister(id, headers, fetcher as TApiFetcher<void>),
		participants: (id: string, params?: { limit?: number; offset?: number }) =>
			participants(id, params, headers, fetcher as TApiFetcher<TournamentParticipantDto[]>),
		findMany: (params: { limit?: number; offset?: number }) =>
			findMany(params, headers, fetcher as TApiFetcher<TournamentDto[]>),
		create: (params: TournamentCreateDto) =>
			create(params, headers, fetcher as TApiFetcher<TournamentDto>),
		update: (id: string, params: TournamentUpdateDto) =>
			update(id, params, headers, fetcher as TApiFetcher<TournamentDto>)
	});
};
