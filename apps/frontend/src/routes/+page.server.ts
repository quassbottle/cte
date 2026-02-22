import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	return {
		session: locals.session
	};
};

export const prerender = false;
