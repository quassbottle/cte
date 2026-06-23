import { createBackendClient } from '$lib/server/backend/client';
import { backendErrorMessage, backendErrorStatus } from '$lib/server/backend/errors';
import * as commands from '$lib/server/tournaments/tournament-page.commands';
import { getTournamentPage } from '$lib/server/tournaments/tournament-page.query';
import { tournamentRegisterFormSchema } from '$lib/schemas/tournament-page.schema';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { locals, params } = event;
	try {
		return await getTournamentPage(
			createBackendClient(event),
			params.slug,
			locals.session?.user.id
		);
	} catch (cause) {
		throw error(backendErrorStatus(cause, 404), backendErrorMessage(cause, 'Tournament not found'));
	}
};

export const actions: Actions = {
	register: async (event) => {
		const { locals, params, request } = event;
		if (!locals.session) {
			return fail(401, { registrationError: 'You must be logged in to register.' });
		}

		const values = Object.fromEntries(await request.formData());
		const parsed = tournamentRegisterFormSchema.safeParse(values);

		if (!parsed.success) {
			return fail(400, {
				registrationError: parsed.error.issues[0]?.message ?? 'Invalid registration form.',
				teamName: String(values.teamName ?? ''),
				teamParticipantIds: String(values.teamParticipantIds ?? '')
			});
		}

		try {
			await commands.registerTournament(createBackendClient(event), params.slug, parsed.data);
		} catch (cause) {
			return fail(backendErrorStatus(cause), {
				registrationError: backendErrorMessage(cause, 'Failed to register.'),
				teamName: String(values.teamName ?? ''),
				teamParticipantIds: String(values.teamParticipantIds ?? '')
			});
		}

		redirect(303, `/events/${params.slug}`);
	},
	unregister: async (event) => {
		const { locals, params } = event;
		if (!locals.session) {
			return fail(401, { registrationError: 'You must be logged in to unregister.' });
		}

		try {
			await commands.unregisterTournament(createBackendClient(event), params.slug);
		} catch (cause) {
			return fail(backendErrorStatus(cause), {
				registrationError: backendErrorMessage(cause, 'Failed to unregister.')
			});
		}

		redirect(303, `/events/${params.slug}`);
	}
};

export const ssr = true;
