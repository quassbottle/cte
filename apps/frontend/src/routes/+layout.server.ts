import { api } from '$lib/api/api';
import type { UserDto } from '$lib/api/types';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Make this load depend on the current path so it re-runs on /auth -> / redirect after login.
	const isAuthCallbackRoute = url.pathname === '/auth';

	if (!locals.session) {
		return {
			session: null,
			user: null,
			isAuthCallbackRoute
		};
	}

	const response = await api({ token: locals.session.token }).users().getMe();

	return {
		session: locals.session,
		user: (response.result ?? null) as UserDto | null,
		isAuthCallbackRoute
	};
};
