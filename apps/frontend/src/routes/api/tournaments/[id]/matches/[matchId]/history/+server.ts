import { createBackendClient } from '$lib/server/backend/client';
import { throwBackendError } from '$lib/server/backend/errors';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	try {
		const response = await createBackendClient(event).matches.history(
			event.params.id,
			event.params.matchId
		);
		return json(response.data);
	} catch (cause) {
		return throwBackendError(cause, 502, 'Match history failed');
	}
};
