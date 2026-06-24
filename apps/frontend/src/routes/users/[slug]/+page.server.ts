import { createBackendClient } from '$lib/server/backend/client';
import { getUserProfile } from '$lib/server/services/users/user-profile.query';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params }) => {
	try {
		return {
			user: await getUserProfile(createBackendClient({ fetch }), params.slug)
		};
	} catch {
		throw error(404, 'User not found');
	}
};
