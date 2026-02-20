import { fetcherFactory, type TApiFetcher, type THeaders } from '$lib/api/fetcher';
import type { UserAuthenticatedDto } from '$lib/api/types';

const oauth = async (
	code: string,
	headers: THeaders,
	fetcher: TApiFetcher<UserAuthenticatedDto>
) => {
	const route = `/api/authorize/oauth`;
	const query = new URLSearchParams();

	query.set('code', code);

	return fetcher({ method: 'GET', route, headers, query });
};

export const authorize = (headers: THeaders) => {
	const fetcher = fetcherFactory();

	return Object.freeze({
		oauth: (code: string) => oauth(code, headers, fetcher as TApiFetcher<UserAuthenticatedDto>)
	});
};
