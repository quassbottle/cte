import type { StageDto, TournamentDto, TournamentParticipantDto, UserDto } from '$lib/api/types';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api } from '$lib/api/api';

export const load: PageServerLoad = async ({ locals, params }) => {
	const tournamentResponse = await api({ token: locals.session?.token })
		.tournaments()
		.getById(params.slug);

	if (tournamentResponse.error || !tournamentResponse.result) {
		throw error(404, 'Tournament not found');
	}

	const participantsResponse = await api().tournaments().participants(params.slug);
	const hostResponse = await api().users().getById(tournamentResponse.result.creatorId);
	const stagesResponse = await api({ token: locals.session?.token }).stages().findMany({
		limit: 100
	});

	const tournament = tournamentResponse.result as TournamentDto;
	const participants = participantsResponse.result as TournamentParticipantDto[];
	const host = hostResponse.result as UserDto;
	const stages = ((stagesResponse.result as StageDto[] | undefined) ?? []).filter(
		(stage) => stage.tournamentId === tournament.id
	);
	const canEditTournament = tournament.creatorId === locals.session?.id;

	return {
		tournament,
		participants,
		host,
		stages,
		canEditTournament
	};
};

export const actions: Actions = {
	register: async ({ locals, params }) => {
		await api({ token: locals.session?.token }).tournaments().register(params.slug);
	},
	unregister: async ({ locals, params }) => {
		await api({ token: locals.session?.token }).tournaments().unregister(params.slug);
	}
};

export const ssr = true;
