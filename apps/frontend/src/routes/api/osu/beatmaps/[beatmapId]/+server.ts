import { createBackendClient } from '$lib/server/backend/client';
import { throwBackendError } from '$lib/server/backend/errors';
import { osuBeatmapMetadataSchema } from '$lib/schemas/osu.schema';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const beatmapId = Number.parseInt(event.params.beatmapId, 10);

	if (!Number.isInteger(beatmapId) || beatmapId <= 0) {
		throw error(400, 'Invalid beatmap id');
	}

	try {
		const response = await createBackendClient(event).osu.getBeatmapMetadata(beatmapId);
		return json(osuBeatmapMetadataSchema.parse(response.data));
	} catch (cause) {
		return throwBackendError(cause, 404, 'Beatmap metadata not found');
	}
};
