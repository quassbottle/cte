import type { RegisterTournamentDto } from '$lib/api/generated/model';
import type { BackendClient } from '$lib/server/backend/client';

export function registerTournament(
	backend: BackendClient,
	tournamentId: string,
	input: RegisterTournamentDto
) {
	return backend.tournaments.register(tournamentId, input);
}

export function unregisterTournament(backend: BackendClient, tournamentId: string) {
	return backend.tournaments.unregister(tournamentId);
}
