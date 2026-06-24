import type { BackendClient } from '$lib/server/backend/client';

export class TournamentEditAccessError extends Error {
	constructor() {
		super("You aren't allowed to edit this tournament");
	}
}

export async function getTournamentEditPage(
	backend: BackendClient,
	tournamentId: string,
	viewerId: string
) {
	const tournamentResponse = await backend.tournaments.getById(tournamentId);
	const tournament = tournamentResponse.data;

	if (tournament.creatorId !== viewerId) {
		throw new TournamentEditAccessError();
	}

	const [stagesResponse, mappoolsResponse] = await Promise.all([
		backend.stages.findByTournament(tournamentId),
		backend.mappools.findByTournamentForManagement(tournamentId)
	]);
	const mappools = mappoolsResponse.data;

	return {
		tournament,
		stages: stagesResponse.data,
		mappools: mappools.map(({ beatmaps, ...mappool }) => mappool),
		mappoolBeatmaps: mappools.map((mappool) => ({
			mappoolId: mappool.id,
			beatmaps: mappool.beatmaps
		}))
	};
}
