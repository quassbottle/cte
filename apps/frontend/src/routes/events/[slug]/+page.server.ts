import type { TournamentDto, UserDto } from '$lib/api/types';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '$lib/api/api';

export const load: PageServerLoad = async ({ locals, params }) => {
	const tournamentResponse = await api({ token: locals.session?.token })
		.tournaments()
		.getById(params.slug);

	if (tournamentResponse.error) {
		throw error(404, 'Tournament not found');
	}

	const participantsResponse = await api().tournaments().participants(params.slug);
	const hostResponse = await api().users().getById(tournamentResponse.result.hostId);

	const tournament = tournamentResponse.result as TournamentDto;
	const participants = participantsResponse.result as UserDto[];
	const host = hostResponse.result as UserDto;

	return {
		tournament,
		participants,
		host
	};
};

export const actions = {
	register: async ({ locals, params }) => {
		await api({ token: locals.session?.token }).tournaments().register(params.slug);
	},
	unregister: async ({ locals, params }) => {
		await api({ token: locals.session?.token }).tournaments().unregister(params.slug);
	}
};

export const ssr = true;
