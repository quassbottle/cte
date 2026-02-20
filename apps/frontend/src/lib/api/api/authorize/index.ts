import { fetcherFactory, type TApiFetcher, type THeaders } from '$lib/api/fetcher';
import type { AuthenticatedUserDto } from '$lib/api/types';

const oauth = async (
	code: string,
	headers: THeaders,
	fetcher: TApiFetcher<AuthenticatedUserDto>
) => {
	const route = `/api/auth/auth-callback`;
	const query = new URLSearchParams();

	query.set('code', code);

	return fetcher({ method: 'GET', route, headers, query });
};

export const authorize = (headers: THeaders) => {
	const fetcher = fetcherFactory();

	return Object.freeze({
		oauth: (code: string) => oauth(code, headers, fetcher as TApiFetcher<AuthenticatedUserDto>)
	});
};
