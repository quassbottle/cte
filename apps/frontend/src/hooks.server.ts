import { authenticateUser } from '$lib/api/auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.session = await authenticateUser(event);

	const response = await resolve(event);

	return response;
};
