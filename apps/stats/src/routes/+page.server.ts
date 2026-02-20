import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		osuUser: locals.osuUser ?? null
	};
};
