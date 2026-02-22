import type { MappoolBeatmapDto, MappoolDto, StageDto, TournamentDto } from '$lib/api/types';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '$lib/api/api';

export const load: PageServerLoad = async ({ locals, params }) => {
	const tournamentResponse = await api({ token: locals.session?.token })
		.tournaments()
		.getById(params.slug);

	if (tournamentResponse.error || !tournamentResponse.result) {
		throw error(tournamentResponse.error?.status ?? 404, tournamentResponse.error?.message ?? 'Not found');
	}
	if (tournamentResponse.result.creatorId !== locals.session?.id) {
		throw error(403, "You aren't allowed to be here");
	}

	const tournament = tournamentResponse.result as TournamentDto;
	const stagesResponse = await api({ token: locals.session?.token }).stages().findMany(params.slug, {
		limit: 100
	});
	const stages = (stagesResponse.result as StageDto[] | undefined) ?? [];
	const mappoolsResponse = await api({ token: locals.session?.token }).mappools().findMany({
		limit: 100
	});
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

	return {
		tournament,
		stages,
		mappools,
		mappoolBeatmaps
	};
};

export const ssr = true;
