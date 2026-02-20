import type { UserDto } from '$lib/api/types';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '$lib/api/api';

export const load: PageServerLoad = async ({ params }) => {
	const candidate = await api().users().getById(params.slug);

	if (candidate.error) {
		throw error(404, 'User not found');
	}

	return {
		user: candidate.result as UserDto
	};
};

export const prerender = true;
