import type {
	MappoolBeatmapAddForm,
	MappoolBeatmapDeleteForm,
	MappoolBeatmapReplaceForm,
	MappoolBeatmapUpdateForm,
	MappoolCreateForm,
	MappoolVisibilityForm,
	StageCreateForm,
	StageDeleteForm,
	StageUpdateForm,
	TournamentEditForm
} from '$lib/schemas/tournament-edit.schema';
import type { BackendClient } from '$lib/server/backend/client';

export function updateTournament(backend: BackendClient, tournamentId: string, input: TournamentEditForm) {
	return backend.tournaments.update(tournamentId, input);
}

export function createStage(backend: BackendClient, tournamentId: string, input: StageCreateForm) {
	return backend.stages.create(tournamentId, input);
}

export function updateStage(backend: BackendClient, tournamentId: string, input: StageUpdateForm) {
	return backend.stages.update(tournamentId, input.stageId, input);
}

export function deleteStage(backend: BackendClient, tournamentId: string, input: StageDeleteForm) {
	return backend.stages.delete(tournamentId, input.stageId);
}

export function createMappool(backend: BackendClient, input: MappoolCreateForm) {
	return backend.mappools.create(input);
}

export function updateMappoolVisibility(backend: BackendClient, input: MappoolVisibilityForm) {
	return backend.mappools.update(input.mappoolId, { hidden: input.hidden });
}

export async function addMappoolBeatmap(backend: BackendClient, input: MappoolBeatmapAddForm) {
	const metadata = await backend.osu.getBeatmapMetadata(input.beatmapId);

	return backend.mappools.addBeatmap(input.mappoolId, {
		mod: input.mod,
		beatmapId: input.beatmapId,
		beatmapsetId: input.beatmapsetId ?? metadata.data.osuBeatmapsetId
	});
}

export function updateMappoolBeatmap(backend: BackendClient, input: MappoolBeatmapUpdateForm) {
	return backend.mappools.updateBeatmap(input.mappoolId, input.osuBeatmapId, {
		mod: input.mod,
		index: input.index
	});
}

export async function replaceMappoolBeatmap(
	backend: BackendClient,
	input: MappoolBeatmapReplaceForm
) {
	const metadata = await backend.osu.getBeatmapMetadata(input.beatmapId);

	return backend.mappools.updateBeatmap(input.mappoolId, input.osuBeatmapId, {
		beatmapId: input.beatmapId,
		beatmapsetId: input.beatmapsetId ?? metadata.data.osuBeatmapsetId
	});
}

export function deleteMappoolBeatmap(backend: BackendClient, input: MappoolBeatmapDeleteForm) {
	return backend.mappools.deleteBeatmap(input.mappoolId, input.osuBeatmapId);
}
