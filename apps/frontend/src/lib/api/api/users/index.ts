import { fetcherFactory, type TApiFetcher, type THeaders } from '$lib/api/fetcher';
import type { UserDto } from '$lib/api/types';

const getById = async (id: string, headers: THeaders, fetcher: TApiFetcher<UserDto>) => {
	const route = `/api/users/${id}`;
	return fetcher({ method: 'GET', route, headers });
};

export const users = (headers: THeaders) => {
	const fetcher = fetcherFactory();

	return Object.freeze({
		getById: (id: string) => getById(id, headers, fetcher as TApiFetcher<UserDto>)
	});
};
