import { resolveSession } from '$lib/server/auth/session';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.session = await resolveSession(event.cookies, undefined, event.fetch);
	return resolve(event);
};
