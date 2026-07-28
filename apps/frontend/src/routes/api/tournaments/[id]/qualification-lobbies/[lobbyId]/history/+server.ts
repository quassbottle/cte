import { createBackendClient } from '$lib/server/backend/client';
import { throwBackendError } from '$lib/server/backend/errors';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	try {
		const response = await createBackendClient(event).qualificationLobbies.history(
			event.params.id,
			event.params.lobbyId
		);
		return json(response.data);
	} catch (cause) {
		return throwBackendError(cause, 502, 'Qualification history failed');
	}
};
