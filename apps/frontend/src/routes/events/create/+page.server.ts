import { api } from '$lib/api/api';
import type { TournamentCreateDto } from '$lib/api/types.js';
import { formBody } from '$lib/utils/form-helpers.js';
import type { Actions } from './$types';

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const values = await request.formData();
		const body = formBody(values) as unknown as TournamentCreateDto; // TODO: unsafe!!!

		console.log(
			await api({ token: locals.session?.token })
				.tournaments()
				.create({
					...body,
					description: null,
					rules: null,
					mode: body.mode,
					isTeam: false,
					startsAt: new Date().toISOString(),
					endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
				})
		);
	}
};
