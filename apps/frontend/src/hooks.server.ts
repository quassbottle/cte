import { resolveSession } from '$lib/server/auth/session';
import { isBackendRequestError } from '$lib/server/backend/errors';
import type { Handle, HandleServerError } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.session = await resolveSession(event.cookies, undefined, event.fetch);
	return resolve(event);
};

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const request = `${event.request.method} ${event.url.pathname} -> ${status}`;
	if (isBackendRequestError(error)) {
		console.error(
			`[Frontend] ${request}`,
			{
				backendStatus: error.status,
				backendUrl: error.url,
				backendBody: error.body
			},
			error.cause ?? error
		);
	} else {
		console.error(`[Frontend] ${request}`, error);
	}
	return { message };
};
