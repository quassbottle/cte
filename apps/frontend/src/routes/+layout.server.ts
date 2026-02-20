import { api } from '$lib/api/api';
import type { UserDto } from '$lib/api/types';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.session) {
		return {
			session: null,
			user: null
		};
	}

	const response = await api().users().getById(locals.session.id);

	return {
		session: locals.session,
		user: response.result as UserDto
	};
};
