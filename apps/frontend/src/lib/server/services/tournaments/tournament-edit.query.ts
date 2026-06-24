import type { BackendClient } from '$lib/server/backend/client';
import type { Viewer } from '$lib/types/viewer';

export class TournamentEditAccessError extends Error {
	constructor(message = "You aren't allowed to edit this tournament") {
		super(message);
	}
}

export async function getTournamentEditPage(
	backend: BackendClient,
	tournamentId: string,
	viewer: Pick<Viewer, 'id' | 'role'>
) {
	const tournamentResponse = await backend.tournaments.getById(tournamentId);
	const tournament = tournamentResponse.data;

	if (tournament.creatorId !== viewer.id && viewer.role !== 'admin') {
		throw new TournamentEditAccessError();
	}

	if (tournament.archivedAt) {
		throw new TournamentEditAccessError("Archived tournaments can't be edited");
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
