import type { BackendClient } from '$lib/server/backend/client';
import type { Viewer } from '$lib/types/viewer';

export async function getTournamentPage(
	backend: BackendClient,
	tournamentId: string,
	viewer?: Pick<Viewer, 'id' | 'role'>,
	qualificationSort: {
		sortBeatmapId?: number;
		sortDirection: 'asc' | 'desc';
	} = { sortDirection: 'asc' }
) {
	const [
		tournamentResponse,
		participantsResponse,
		teamsResponse,
		staffResponse,
		stagesResponse,
		scheduleResponse,
		qualificationLobbiesResponse,
		mappoolsResponse
	] = await Promise.all([
		backend.tournaments.getById(tournamentId),
		backend.tournaments.getParticipants(tournamentId),
		backend.tournaments.getTeams(tournamentId),
		backend.tournaments.staff.get(tournamentId),
		backend.stages.findByTournament(tournamentId),
		backend.tournaments.getSchedule(tournamentId),
		backend.qualificationLobbies.findByTournament(tournamentId),
		backend.mappools.findByTournament(tournamentId)
	]);
	const tournament = tournamentResponse.data;
	const canEditTournament =
		!!viewer && (tournament.creatorId === viewer.id || viewer.role === 'admin');
	const host = (await backend.users.getById(tournament.creatorId)).data;
	const visibleMappools = mappoolsResponse.data;
	const qualificationStatistics = stagesResponse.data.some(
		({ type }) => type === 'qualification'
	)
		? (await backend.qualificationResults.find(tournamentId, qualificationSort)).data
		: null;

	return {
		tournament,
		participants: participantsResponse.data,
		teams: teamsResponse.data,
		staff: staffResponse.data,
		host,
		stages: stagesResponse.data,
		schedule: scheduleResponse.data,
		qualificationLobbies: qualificationLobbiesResponse.data,
		qualificationStatistics,
		mappools: visibleMappools.map(({ beatmaps, ...mappool }) => mappool),
		mappoolBeatmaps: visibleMappools.map((mappool) => ({
			mappoolId: mappool.id,
			beatmaps: mappool.beatmaps
		})),
		canEditTournament
	};
}
