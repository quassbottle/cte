import { createBackendClient } from '$lib/server/backend/client';
import { throwBackendError } from '$lib/server/backend/errors';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const backend = createBackendClient(event);

	try {
		const [tournamentResponse, statisticsResponse] = await Promise.all([
			backend.tournaments.getById(event.params.slug),
			backend.qualificationResults.find(event.params.slug)
		]);

		return {
			tournament: tournamentResponse.data,
			statistics: statisticsResponse.data
		};
	} catch (cause) {
		throwBackendError(cause, 404, 'Tournament not found');
	}
};
