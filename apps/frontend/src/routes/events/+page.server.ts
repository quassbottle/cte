import { api } from '$lib/api/api';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page') ?? 0);
	const limit = 20;
	const offset = page * limit;

	const tournaments = await api().tournaments().findMany({ limit, offset });

	return {
		tournaments: tournaments.result
	};
};
