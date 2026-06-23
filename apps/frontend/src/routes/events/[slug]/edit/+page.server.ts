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
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import type { z } from 'zod';

const requireSession = (locals: App.Locals) => {
	if (!locals.session) {
		throw error(401, 'Authentication required');
	}

	return locals.session;
};

const runFormAction = async <Schema extends z.ZodTypeAny>(
	event: RequestEvent,
	action: string,
	schema: Schema,
	run: (backend: ReturnType<typeof createBackendClient>, input: z.infer<Schema>) => Promise<unknown>
) => {
	requireSession(event.locals);
	const backend = createBackendClient(event);
	const values = Object.fromEntries(await event.request.formData());
	const parsed = schema.safeParse(values);
	const context = {
		stageId: typeof values.stageId === 'string' ? values.stageId : undefined,
		mappoolId: typeof values.mappoolId === 'string' ? values.mappoolId : undefined
	};

	if (!parsed.success) {
		return fail(400, {
			action,
			message: parsed.error.issues[0]?.message ?? 'Invalid form data',
			...context
		});
	}

	try {
		await run(backend, parsed.data);
	} catch (cause) {
		return fail(backendErrorStatus(cause), {
			action,
			message: backendErrorMessage(cause, 'Request failed'),
			...context
		});
	}

	return {
		action,
		ok: true,
		...context
	};
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
		runFormAction(event, 'updateTournament', tournamentEditFormSchema, (backend, input) =>
			commands.updateTournament(backend, event.params.slug, input)
		),
	createStage: (event) =>
		runFormAction(event, 'createStage', stageCreateFormSchema, (backend, input) =>
			commands.createStage(backend, event.params.slug, input)
		),
	updateStage: (event) =>
		runFormAction(event, 'updateStage', stageUpdateFormSchema, (backend, input) =>
			commands.updateStage(backend, event.params.slug, input)
		),
	deleteStage: (event) =>
		runFormAction(event, 'deleteStage', stageDeleteFormSchema, (backend, input) =>
			commands.deleteStage(backend, event.params.slug, input)
		),
	createMappool: (event) =>
		runFormAction(event, 'createMappool', mappoolCreateFormSchema, (backend, input) =>
			commands.createMappool(backend, input)
		),
	updateMappoolVisibility: (event) =>
		runFormAction(event, 'updateMappoolVisibility', mappoolVisibilityFormSchema, (backend, input) =>
			commands.updateMappoolVisibility(backend, input)
		),
	addMappoolBeatmap: (event) =>
		runFormAction(event, 'addMappoolBeatmap', mappoolBeatmapAddFormSchema, (backend, input) =>
			commands.addMappoolBeatmap(backend, input)
		),
	updateMappoolBeatmap: (event) =>
		runFormAction(event, 'updateMappoolBeatmap', mappoolBeatmapUpdateFormSchema, (backend, input) =>
			commands.updateMappoolBeatmap(backend, input)
		),
	replaceMappoolBeatmap: (event) =>
		runFormAction(event, 'replaceMappoolBeatmap', mappoolBeatmapReplaceFormSchema, (backend, input) =>
			commands.replaceMappoolBeatmap(backend, input)
		),
	deleteMappoolBeatmap: (event) =>
		runFormAction(event, 'deleteMappoolBeatmap', mappoolBeatmapDeleteFormSchema, (backend, input) =>
			commands.deleteMappoolBeatmap(backend, input)
		)
};

export const ssr = true;
