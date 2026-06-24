import type { BackendClient } from '$lib/server/backend/client';
import type { TournamentControllerFindManyParams } from '$lib/server/backend/generated/model';

export function getTournamentList(
	backend: BackendClient,
	input: TournamentControllerFindManyParams
) {
	return backend.tournaments.findMany(input);
}
