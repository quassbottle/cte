import type { BackendClient } from '$lib/server/backend/client';
import type { TournamentCreateForm } from '$lib/schemas/tournament-create.schema';

export function createTournament(backend: BackendClient, input: TournamentCreateForm) {
	return backend.tournaments.create({
		name: input.name,
		description: null,
		rules: null,
		mode: input.mode,
		isTeam: false,
		startsAt: new Date().toISOString(),
		endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
	});
}
