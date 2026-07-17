import { createBackendClient } from '$lib/server/backend/client';
import { throwBackendError } from '$lib/server/backend/errors';
import { getUserProfile } from '$lib/server/services/users/user-profile.query';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params }) => {
	try {
		return {
			user: await getUserProfile(createBackendClient({ fetch }), params.slug)
		};
	} catch (cause) {
		throwBackendError(cause, 404, 'User not found');
	}
};
