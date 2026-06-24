import type { BackendClient } from '$lib/server/backend/client';

export function getTournamentList(
	backend: BackendClient,
	input: { limit: number; offset: number }
) {
	return backend.tournaments.findMany(input);
}
