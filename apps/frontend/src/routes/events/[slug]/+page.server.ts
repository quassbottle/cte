import type {
	MappoolBeatmapDto,
	MappoolDto,
	StageDto,
	TournamentParticipantDto,
	UserDto
} from '$lib/api/types';
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
	const stagesResponse = await api({ token: locals.session?.token }).stages().findMany(params.slug, {
		limit: 100
	});
	const mappoolsResponse = await api({ token: locals.session?.token }).mappools().findMany({
		limit: 100
	});

	const tournament = tournamentResponse.result;
	const participants = participantsResponse.result as TournamentParticipantDto[];
	const host = hostResponse.result as UserDto;
	const stages = (stagesResponse.result ?? []) as StageDto[];
	const stageIdSet = new Set(stages.map((stage) => stage.id));
	const mappools = ((mappoolsResponse.result ?? []) as MappoolDto[]).filter((mappool) =>
		stageIdSet.has(mappool.stageId)
	);
	const mappoolBeatmaps = await Promise.all(
		mappools.map(async (mappool) => {
			const response = await api({ token: locals.session?.token }).mappools().findBeatmaps(mappool.id);
			return {
				mappoolId: mappool.id,
				beatmaps: (response.result ?? []) as MappoolBeatmapDto[]
			};
		})
	);
	const canEditTournament = tournament.creatorId === locals.session?.id;

	return {
		tournament,
		participants,
		host,
		stages,
		mappools,
		mappoolBeatmaps,
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
