import { createBackendClient } from '$lib/server/backend/client';
import { backendErrorMessage, backendErrorStatus } from '$lib/server/backend/errors';
import * as commands from '$lib/server/services/tournaments/tournament-page.commands';
import { getTournamentPage } from '$lib/server/services/tournaments/tournament-page.query';
import { tournamentRegisterFormSchema } from '$lib/schemas/tournament-page.schema';
import type { BackendClient } from '$lib/server/backend/client';
import type { SelectedUser } from '$lib/schemas/user.schema';
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

const parseParticipantIds = (value: FormDataEntryValue | undefined) =>
	Array.from(
		new Set(
			String(value ?? '')
				.split(/[\s,]+/)
				.map((item) => item.trim())
				.filter(Boolean)
		)
	);

const resolveSelectedUsers = async (
	backend: BackendClient,
	value: FormDataEntryValue | undefined
): Promise<SelectedUser[]> => {
	const users: SelectedUser[] = [];

	for (const id of parseParticipantIds(value)) {
		try {
			const response = await backend.users.getById(id);
			users.push({
				id: response.data.id,
				osuId: response.data.osuId,
				osuUsername: response.data.osuUsername,
				avatarUrl: response.data.avatarUrl
			});
		} catch {
			// Invalid teammate ids are handled by the registration action itself.
		}
	}

	return users;
};

export const actions: Actions = {
	register: async (event) => {
		const { locals, params, request } = event;
		if (!locals.session) {
			return fail(401, { registrationError: 'You must be logged in to register.' });
		}

		const values = Object.fromEntries(await request.formData());
		const parsed = tournamentRegisterFormSchema.safeParse(values);
		const backend = createBackendClient(event);

		if (!parsed.success) {
			return fail(400, {
				registrationError: parsed.error.issues[0]?.message ?? 'Invalid registration form.',
				teamName: String(values.teamName ?? ''),
				selectedUsers: await resolveSelectedUsers(backend, values.teamParticipantIds)
			});
		}

		try {
			await commands.registerTournament(backend, params.slug, parsed.data);
		} catch (cause) {
			return fail(backendErrorStatus(cause), {
				registrationError: backendErrorMessage(cause, 'Failed to register.'),
				teamName: String(values.teamName ?? ''),
				selectedUsers: await resolveSelectedUsers(backend, values.teamParticipantIds)
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
	},
	selectQualificationLobbySolo: async (event) => {
		if (!event.locals.session) return fail(401, { message: 'You must be logged in.' });
		const lobbyId = String((await event.request.formData()).get('lobbyId') ?? '');
		if (!lobbyId) return fail(400, { message: 'Lobby is required.' });
		try {
			await createBackendClient(event).qualificationLobbies.selectSolo(event.params.slug, lobbyId);
		} catch (cause) {
			return fail(backendErrorStatus(cause), {
				message: backendErrorMessage(cause, 'Selection failed.')
			});
		}
		return { ok: true };
	},
	selectQualificationLobbyTeam: async (event) => {
		if (!event.locals.session) return fail(401, { message: 'You must be logged in.' });
		const values = Object.fromEntries(await event.request.formData());
		const lobbyId = String(values.lobbyId ?? '');
		const teamId = String(values.teamId ?? '');
		if (!lobbyId || !teamId) return fail(400, { message: 'Lobby and team are required.' });
		try {
			await createBackendClient(event).qualificationLobbies.selectTeam(
				event.params.slug,
				lobbyId,
				teamId
			);
		} catch (cause) {
			return fail(backendErrorStatus(cause), {
				message: backendErrorMessage(cause, 'Selection failed.')
			});
		}
		return { ok: true };
	}
};

export const ssr = true;
