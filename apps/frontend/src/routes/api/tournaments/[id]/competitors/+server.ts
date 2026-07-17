import { createBackendClient } from '$lib/server/backend/client';
import { throwBackendError } from '$lib/server/backend/errors';
import { normalizePlayers, normalizeTeams } from '$lib/utils/competitor-search';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, params, request, url }) => {
	const query = url.searchParams.get('query')?.trim() ?? '';
	const type = url.searchParams.get('type');

	if (type !== 'player' && type !== 'team') {
		throw error(400, 'Competitor type must be player or team');
	}

	try {
		const backend = createBackendClient({ fetch });
		if (type === 'player') {
			const response = await backend.tournaments.searchParticipants(
				params.id,
				query,
				request.signal
			);
			return json(normalizePlayers(response.data));
		}

		const response = await backend.tournaments.searchTeams(params.id, query, request.signal);
		return json(normalizeTeams(response.data));
	} catch (cause) {
		return throwBackendError(cause, 502, 'Competitor search failed');
	}
};
