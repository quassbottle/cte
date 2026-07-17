import { createBackendClient } from '$lib/server/backend/client';
import { backendErrorMessage, backendErrorStatus } from '$lib/server/backend/errors';
import {
	TournamentEditAccessError,
	getTournamentEditPage
} from '$lib/server/services/tournaments/tournament-edit.query';
import * as commands from '$lib/server/services/tournaments/tournament-edit.commands';
import {
	mappoolBeatmapAddFormSchema,
	mappoolBeatmapDeleteFormSchema,
	mappoolBeatmapReplaceFormSchema,
	mappoolBeatmapUpdateFormSchema,
	mappoolCreateFormSchema,
	mappoolVisibilityFormSchema,
	qualificationSoloFormSchema,
	qualificationSoloUnregisterFormSchema,
	qualificationTeamFormSchema,
	qualificationTeamMemberFormSchema,
	qualificationTeamUnregisterFormSchema,
	scheduleMatchFormSchema,
	stageCreateFormSchema,
	stageDeleteFormSchema,
	stageUpdateFormSchema,
	tournamentEditFormSchema,
	tournamentStaffFormSchema
} from '$lib/schemas/tournament-edit.schema';
import type { EditAction, TournamentEditActionResult } from '$lib/types/tournament-edit-action';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import type { z } from 'zod';

const requireSession = (locals: App.Locals) => {
	if (!locals.session) {
		throw error(401, 'Authentication required');
	}

	return locals.session;
};

type ActionContext = {
	stageId?: string;
	matchId?: string;
	lobbyId?: string;
	mappoolId?: string;
	beatmapId?: string;
	teamId?: string;
	userId?: string;
	roleId?: string;
};

const stringValue = (value: FormDataEntryValue | undefined) =>
	typeof value === 'string' ? value : undefined;

const lobbyInput = (values: Record<string, FormDataEntryValue>) => {
	const stageId = stringValue(values.stageId);
	const refereeId = stringValue(values.refereeId);
	const number = Number(values.number);
	const startsAt = new Date(String(values.startsAt ?? ''));
	const endsAt = new Date(String(values.endsAt ?? ''));
	if (
		!stageId ||
		!refereeId ||
		!Number.isInteger(number) ||
		number < 1 ||
		Number.isNaN(startsAt.valueOf()) ||
		Number.isNaN(endsAt.valueOf()) ||
		endsAt <= startsAt
	) {
		throw new Error('Enter a stage, referee, positive number, and valid time range.');
	}
	return {
		stageId,
		refereeId,
		number,
		startsAt: startsAt.toISOString(),
		endsAt: endsAt.toISOString(),
		mpUrl: stringValue(values.mpUrl) || null
	};
};

const submitForm = async <Schema extends z.ZodTypeAny>(
	event: RequestEvent,
	action: EditAction,
	schema: Schema,
	values: Record<string, FormDataEntryValue>,
	context: ActionContext,
	run: (backend: ReturnType<typeof createBackendClient>, input: z.infer<Schema>) => Promise<unknown>
) => {
	requireSession(event.locals);
	const backend = createBackendClient(event);
	const parsed = schema.safeParse(values);

	if (!parsed.success) {
		return fail(400, {
			action,
			ok: false,
			message: parsed.error.issues[0]?.message ?? 'Invalid form data',
			errors: parsed.error.flatten().fieldErrors,
			...context
		} satisfies TournamentEditActionResult);
	}

	try {
		await run(backend, parsed.data);
	} catch (cause) {
		return fail(backendErrorStatus(cause), {
			action,
			ok: false,
			message: backendErrorMessage(cause, 'Request failed'),
			errors: {},
			...context
		} satisfies TournamentEditActionResult);
	}

	return {
		action,
		ok: true,
		...context
	} satisfies TournamentEditActionResult;
};

const withFormValues = async <Result>(
	event: RequestEvent,
	run: (values: Record<string, FormDataEntryValue>) => Promise<Result>
) => {
	const values = Object.fromEntries(await event.request.formData());
	return run(values);
};

export const load: PageServerLoad = async (event) => {
	const { locals, params } = event;
	const session = requireSession(locals);
	const backend = createBackendClient(event);

	try {
		return await getTournamentEditPage(backend, params.slug, session.user);
	} catch (cause) {
		if (cause instanceof TournamentEditAccessError) {
			throw error(403, cause.message);
		}

		const status = backendErrorStatus(cause);

		if (status === 401 || status === 403 || status === 404) {
			throw error(status, backendErrorMessage(cause, 'Unable to load tournament editor'));
		}

		throw cause;
	}
};

export const actions: Actions = {
	updateTournament: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'updateTournament',
				tournamentEditFormSchema,
				values,
				{},
				(backend, input) => commands.updateTournament(backend, event.params.slug, input)
			)
		),
	archiveTournament: async (event) => {
		requireSession(event.locals);
		const backend = createBackendClient(event);

		try {
			await commands.archiveTournament(backend, event.params.slug);
		} catch (cause) {
			return fail(backendErrorStatus(cause), {
				action: 'archiveTournament',
				ok: false,
				message: backendErrorMessage(cause, 'Request failed'),
				errors: {}
			} satisfies TournamentEditActionResult);
		}

		redirect(303, `/events/${event.params.slug}`);
	},
	createStage: (event) =>
		withFormValues(event, (values) =>
			submitForm(event, 'createStage', stageCreateFormSchema, values, {}, (backend, input) =>
				commands.createStage(backend, event.params.slug, input)
			)
		),
	updateStage: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'updateStage',
				stageUpdateFormSchema,
				values,
				{ stageId: stringValue(values.stageId) },
				(backend, input) => commands.updateStage(backend, event.params.slug, input)
			)
		),
	deleteStage: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'deleteStage',
				stageDeleteFormSchema,
				values,
				{ stageId: stringValue(values.stageId) },
				(backend, input) => commands.deleteStage(backend, event.params.slug, input)
			)
		),
	createScheduleMatch: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'createScheduleMatch',
				scheduleMatchFormSchema,
				values,
				{},
				(backend, input) => commands.createScheduleMatch(backend, event.params.slug, input)
			)
		),
	updateScheduleMatch: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'updateScheduleMatch',
				scheduleMatchFormSchema,
				values,
				{ matchId: stringValue(values.matchId) },
				(backend, input) => commands.updateScheduleMatch(backend, event.params.slug, input)
			)
		),
	deleteScheduleMatch: async (event) => {
		requireSession(event.locals);
		const values = Object.fromEntries(await event.request.formData());
		const matchId = stringValue(values.matchId);

		if (!matchId) {
			return fail(400, {
				action: 'deleteScheduleMatch',
				ok: false,
				message: 'Match id is required',
				errors: {},
				matchId
			} satisfies TournamentEditActionResult);
		}

		try {
			await commands.deleteScheduleMatch(createBackendClient(event), event.params.slug, matchId);
		} catch (cause) {
			return fail(backendErrorStatus(cause), {
				action: 'deleteScheduleMatch',
				ok: false,
				message: backendErrorMessage(cause, 'Request failed'),
				errors: {},
				matchId
			} satisfies TournamentEditActionResult);
		}

		return {
			action: 'deleteScheduleMatch',
			ok: true,
			matchId
		} satisfies TournamentEditActionResult;
	},
	createQualificationLobby: (event) =>
		withFormValues(event, async (values) => {
			try {
				await commands.createQualificationLobby(
					createBackendClient(event),
					event.params.slug,
					lobbyInput(values)
				);
			} catch (cause) {
				return fail(backendErrorStatus(cause), {
					action: 'createQualificationLobby',
					ok: false,
					message: backendErrorMessage(
						cause,
						cause instanceof Error ? cause.message : 'Request failed'
					),
					errors: {},
					stageId: stringValue(values.stageId)
				} satisfies TournamentEditActionResult);
			}
			return {
				action: 'createQualificationLobby',
				ok: true,
				stageId: stringValue(values.stageId)
			} satisfies TournamentEditActionResult;
		}),
	updateQualificationLobby: (event) =>
		withFormValues(event, async (values) => {
			const lobbyId = stringValue(values.lobbyId);
			try {
				if (!lobbyId) throw new Error('Lobby id is required');
				await commands.updateQualificationLobby(
					createBackendClient(event),
					event.params.slug,
					lobbyId,
					lobbyInput(values)
				);
			} catch (cause) {
				return fail(backendErrorStatus(cause), {
					action: 'updateQualificationLobby',
					ok: false,
					message: backendErrorMessage(
						cause,
						cause instanceof Error ? cause.message : 'Request failed'
					),
					errors: {},
					lobbyId
				} satisfies TournamentEditActionResult);
			}
			return {
				action: 'updateQualificationLobby',
				ok: true,
				lobbyId
			} satisfies TournamentEditActionResult;
		}),
	deleteQualificationLobby: async (event) => {
		requireSession(event.locals);
		const lobbyId = stringValue(Object.fromEntries(await event.request.formData()).lobbyId);
		try {
			if (!lobbyId) throw new Error('Lobby id is required');
			await createBackendClient(event).qualificationLobbies.delete(event.params.slug, lobbyId);
		} catch (cause) {
			return fail(backendErrorStatus(cause), {
				action: 'deleteQualificationLobby',
				ok: false,
				message: backendErrorMessage(
					cause,
					cause instanceof Error ? cause.message : 'Request failed'
				),
				errors: {},
				lobbyId
			} satisfies TournamentEditActionResult);
		}
		return {
			action: 'deleteQualificationLobby',
			ok: true,
			lobbyId
		} satisfies TournamentEditActionResult;
	},
	startQualificationLobby: async (event) => {
		requireSession(event.locals);
		const lobbyId = stringValue(Object.fromEntries(await event.request.formData()).lobbyId);
		try {
			if (!lobbyId) throw new Error('Lobby id is required');
			await createBackendClient(event).qualificationLobbies.start(event.params.slug, lobbyId);
		} catch (cause) {
			return fail(backendErrorStatus(cause), {
				action: 'startQualificationLobby',
				ok: false,
				message: backendErrorMessage(
					cause,
					cause instanceof Error ? cause.message : 'Request failed'
				),
				errors: {},
				lobbyId
			} satisfies TournamentEditActionResult);
		}
		return {
			action: 'startQualificationLobby',
			ok: true,
			lobbyId
		} satisfies TournamentEditActionResult;
	},
	stopQualificationLobby: async (event) => {
		requireSession(event.locals);
		const lobbyId = stringValue(Object.fromEntries(await event.request.formData()).lobbyId);
		try {
			if (!lobbyId) throw new Error('Lobby id is required');
			await createBackendClient(event).qualificationLobbies.stop(event.params.slug, lobbyId);
		} catch (cause) {
			return fail(backendErrorStatus(cause), {
				action: 'stopQualificationLobby',
				ok: false,
				message: backendErrorMessage(
					cause,
					cause instanceof Error ? cause.message : 'Request failed'
				),
				errors: {},
				lobbyId
			} satisfies TournamentEditActionResult);
		}
		return {
			action: 'stopQualificationLobby',
			ok: true,
			lobbyId
		} satisfies TournamentEditActionResult;
	},
	updateQualificationSolo: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'updateQualificationSolo',
				qualificationSoloFormSchema,
				values,
				{ userId: stringValue(values.userId) },
				(backend, input) => commands.updateQualificationSolo(backend, event.params.slug, input)
			)
		),
	updateQualificationTeam: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'updateQualificationTeam',
				qualificationTeamFormSchema,
				values,
				{ teamId: stringValue(values.teamId) },
				(backend, input) => commands.updateQualificationTeam(backend, event.params.slug, input)
			)
		),
	updateQualificationTeamMember: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'updateQualificationTeamMember',
				qualificationTeamMemberFormSchema,
				values,
				{
					teamId: stringValue(values.teamId),
					userId: stringValue(values.userId)
				},
				(backend, input) =>
					commands.updateQualificationTeamMember(backend, event.params.slug, input)
			)
		),
	unregisterQualificationSolo: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'unregisterQualificationSolo',
				qualificationSoloUnregisterFormSchema,
				values,
				{ userId: stringValue(values.userId) },
				(backend, input) => commands.unregisterQualificationSolo(backend, event.params.slug, input)
			)
		),
	unregisterQualificationTeam: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'unregisterQualificationTeam',
				qualificationTeamUnregisterFormSchema,
				values,
				{ teamId: stringValue(values.teamId) },
				(backend, input) => commands.unregisterQualificationTeam(backend, event.params.slug, input)
			)
		),
	assignTournamentStaff: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'assignTournamentStaff',
				tournamentStaffFormSchema,
				values,
				{ roleId: stringValue(values.roleId), userId: stringValue(values.userId) },
				(backend, input) => commands.assignTournamentStaff(backend, event.params.slug, input)
			)
		),
	removeTournamentStaff: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'removeTournamentStaff',
				tournamentStaffFormSchema,
				values,
				{ roleId: stringValue(values.roleId), userId: stringValue(values.userId) },
				(backend, input) => commands.removeTournamentStaff(backend, event.params.slug, input)
			)
		),
	createMappool: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'createMappool',
				mappoolCreateFormSchema,
				values,
				{ stageId: stringValue(values.stageId) },
				(backend, input) => commands.createMappool(backend, input)
			)
		),
	updateMappoolVisibility: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'updateMappoolVisibility',
				mappoolVisibilityFormSchema,
				values,
				{ mappoolId: stringValue(values.mappoolId) },
				(backend, input) => commands.updateMappoolVisibility(backend, input)
			)
		),
	addMappoolBeatmap: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'addMappoolBeatmap',
				mappoolBeatmapAddFormSchema,
				values,
				{ mappoolId: stringValue(values.mappoolId) },
				(backend, input) => commands.addMappoolBeatmap(backend, input)
			)
		),
	updateMappoolBeatmap: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'updateMappoolBeatmap',
				mappoolBeatmapUpdateFormSchema,
				values,
				{
					mappoolId: stringValue(values.mappoolId),
					beatmapId: stringValue(values.osuBeatmapId)
				},
				(backend, input) => commands.updateMappoolBeatmap(backend, input)
			)
		),
	replaceMappoolBeatmap: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'replaceMappoolBeatmap',
				mappoolBeatmapReplaceFormSchema,
				values,
				{
					mappoolId: stringValue(values.mappoolId),
					beatmapId: stringValue(values.osuBeatmapId)
				},
				(backend, input) => commands.replaceMappoolBeatmap(backend, input)
			)
		),
	deleteMappoolBeatmap: (event) =>
		withFormValues(event, (values) =>
			submitForm(
				event,
				'deleteMappoolBeatmap',
				mappoolBeatmapDeleteFormSchema,
				values,
				{
					mappoolId: stringValue(values.mappoolId),
					beatmapId: stringValue(values.osuBeatmapId)
				},
				(backend, input) => commands.deleteMappoolBeatmap(backend, input)
			)
		)
};

export const ssr = true;
