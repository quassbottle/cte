import type { TournamentDto } from '$lib/api/types';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '$lib/api/api';

export const load: PageServerLoad = async ({ locals, params }) => {
	const tournamentResponse = await api({ token: locals.session?.token })
		.tournaments()
		.getById(params.slug);

	if (tournamentResponse.error) {
		throw error(tournamentResponse.error.status, tournamentResponse.error.message);
	}
	if (tournamentResponse.result.hostId !== locals.session?.id) {
		throw error(403, "You aren't allowed to be here");
	}

	const tournament = tournamentResponse.result as TournamentDto;

	return {
		tournament
	};
};

export const ssr = true;
