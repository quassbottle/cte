import { createBackendClient } from '$lib/server/backend/client';
import { backendErrorMessage, backendErrorStatus } from '$lib/server/backend/errors';
import {
	TournamentEditAccessError,
	getTournamentEditPage
} from '$lib/server/tournaments/tournament-edit.query';
import * as commands from '$lib/server/tournaments/tournament-edit.commands';
import {
	mappoolBeatmapAddFormSchema,
	mappoolBeatmapDeleteFormSchema,
	mappoolBeatmapReplaceFormSchema,
	mappoolBeatmapUpdateFormSchema,
	mappoolCreateFormSchema,
	mappoolVisibilityFormSchema,
	stageCreateFormSchema,
	stageDeleteFormSchema,
	stageUpdateFormSchema,
	tournamentEditFormSchema
} from '$lib/schemas/tournament-edit.schema';
import type { EditAction, TournamentEditActionResult } from '$lib/types/tournament-edit-action';
import { error, fail } from '@sveltejs/kit';
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
	mappoolId?: string;
	beatmapId?: string;
};

const stringValue = (value: FormDataEntryValue | undefined) =>
	typeof value === 'string' ? value : undefined;

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
		return await getTournamentEditPage(backend, params.slug, session.user.id);
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
