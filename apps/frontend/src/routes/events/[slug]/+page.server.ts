import type {
	MappoolBeatmapDto,
	MappoolDto,
	RegisterTournamentDto,
	StageDto,
	TournamentParticipantDto,
	TournamentTeamDto,
	UserDto
} from '$lib/api/types';
import { error, fail, redirect } from '@sveltejs/kit';
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
	const teamsResponse = await api().tournaments().teams(params.slug);
	const hostResponse = await api().users().getById(tournamentResponse.result.creatorId);
	const stagesResponse = await api({ token: locals.session?.token }).stages().findMany(params.slug, {
		limit: 100
	});
	const mappoolsResponse = await api({ token: locals.session?.token }).mappools().findMany({
		limit: 100
	});

	const tournament = tournamentResponse.result;
	const participants = participantsResponse.result as TournamentParticipantDto[];
	const teams = (teamsResponse.result ?? []) as TournamentTeamDto[];
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
		teams,
		host,
		stages,
		mappools,
		mappoolBeatmaps,
		canEditTournament
	};
};

export const actions: Actions = {
	register: async ({ locals, params, request }) => {
		if (!locals.session?.token) {
			return fail(401, { registrationError: 'You must be logged in to register.' });
		}

		const values = await request.formData();
		const isTeamTournament = values.get('isTeamTournament') === 'true';

		let body: RegisterTournamentDto | undefined = undefined;
		if (isTeamTournament) {
			const teamName = String(values.get('teamName') ?? '').trim();
			const teamParticipantIdsRaw = String(values.get('teamParticipantIds') ?? '');
			const teamParticipantIds = Array.from(
				new Set(
					teamParticipantIdsRaw
						.split(/[\s,]+/)
						.map((value) => value.trim())
						.filter((value) => value.length > 0)
				)
			);

			if (!teamName) {
				return fail(400, {
					registrationError: 'Team name is required.',
					teamName,
					teamParticipantIds: teamParticipantIdsRaw
				});
			}
			if (teamParticipantIds.length === 0) {
				return fail(400, {
					registrationError: 'At least one teammate id is required.',
					teamName,
					teamParticipantIds: teamParticipantIdsRaw
				});
			}

			body = {
				team: {
					name: teamName,
					participants: teamParticipantIds
				}
			};
		}

		const response = await api({ token: locals.session.token }).tournaments().register(params.slug, body);
		if (!response.success) {
			return fail(response.error?.status ?? 400, {
				registrationError: response.error?.message ?? 'Failed to register.',
				teamName: String(values.get('teamName') ?? ''),
				teamParticipantIds: String(values.get('teamParticipantIds') ?? '')
			});
		}

		redirect(303, `/events/${params.slug}`);
	},
	unregister: async ({ locals, params }) => {
		if (!locals.session?.token) {
			return fail(401, { registrationError: 'You must be logged in to unregister.' });
		}

		const response = await api({ token: locals.session.token }).tournaments().unregister(params.slug);
		if (!response.success) {
			return fail(response.error?.status ?? 400, {
				registrationError: response.error?.message ?? 'Failed to unregister.'
			});
		}

		redirect(303, `/events/${params.slug}`);
	}
};

export const ssr = true;
