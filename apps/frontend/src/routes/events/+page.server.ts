import { createBackendClient } from '$lib/server/backend/client';
import { getTournamentList } from '$lib/server/services/tournaments/tournament-list.query';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const page = Number(url.searchParams.get('page') ?? 0);
	const limit = 20;
	const offset = page * limit;

	const tournaments = await getTournamentList(createBackendClient({ fetch }), { limit, offset });

	return {
		tournaments: tournaments.data
	};
};
