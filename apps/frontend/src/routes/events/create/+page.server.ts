import { api } from '$lib/api/api';
import type { TournamentCreateDto } from '$lib/api/types.js';
import { formBody } from '$lib/utils/form-helpers.js';

export const actions = {
	create: async ({ locals, request }) => {
		const values = await request.formData();
		const body = formBody(values) as unknown as TournamentCreateDto; // TODO: unsafe!!!

		console.log(
			await api({ token: locals.session?.token })
				.tournaments()
				.create({ ...body, endsAt: null, startsAt: new Date(), type: 'classic' })
		);
	}
};
