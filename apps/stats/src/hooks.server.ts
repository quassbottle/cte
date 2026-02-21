import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const userId = event.cookies.get('osu_user_id');
	const username = event.cookies.get('osu_user_name') ?? undefined;

	if (userId) {
		event.locals.osuUser = {
			id: Number(userId),
			username
		};
	}

	return resolve(event);
};
