import { createBackendClient } from '$lib/server/backend/client';
import { backendErrorMessage, backendErrorStatus } from '$lib/server/backend/errors';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, params }) => {
	try {
		const response = await createBackendClient({ fetch }).users.getById(params.id);
		return json(response.data);
	} catch (cause) {
		throw error(backendErrorStatus(cause, 404), backendErrorMessage(cause, 'User not found'));
	}
};
