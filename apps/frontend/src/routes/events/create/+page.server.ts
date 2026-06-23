import { createBackendClient } from '$lib/server/backend/client';
import { backendErrorMessage, backendErrorStatus } from '$lib/server/backend/errors';
import { createTournament } from '$lib/server/tournaments/tournament-create.commands';
import { tournamentCreateFormSchema } from '$lib/schemas/tournament-create.schema';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	create: async (event) => {
		const { locals, request } = event;
		if (!locals.session) {
			return fail(401, { error: 'You must be logged in to create a tournament.' });
		}

		const values = Object.fromEntries(await request.formData());
		const parsed = tournamentCreateFormSchema.safeParse(values);

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Invalid tournament form.',
				name: String(values.name ?? ''),
				mode: String(values.mode ?? '')
			});
		}

		let tournament;
		try {
			tournament = await createTournament(createBackendClient(event), parsed.data);
		} catch (cause) {
			return fail(backendErrorStatus(cause), {
				error: backendErrorMessage(cause, 'Failed to create tournament.'),
				name: String(values.name ?? ''),
				mode: String(values.mode ?? '')
			});
		}

		throw redirect(303, `/events/${tournament.data.id}`);
	}
};
