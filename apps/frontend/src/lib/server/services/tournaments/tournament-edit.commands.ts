import type { QualificationLobbyUpsertDto } from '$lib/api/generated/model';
import type {
	MappoolBeatmapAddForm,
	MappoolBeatmapDeleteForm,
	MappoolBeatmapReplaceForm,
	MappoolBeatmapUpdateForm,
	MappoolCreateForm,
	MappoolVisibilityForm,
	QualificationSoloForm,
	QualificationTeamForm,
	QualificationTeamMemberForm,
	ScheduleMatchForm,
	StageCreateForm,
	StageDeleteForm,
	StageUpdateForm,
	TournamentEditForm,
	TournamentStaffForm
} from '$lib/schemas/tournament-edit.schema';
import type { BackendClient } from '$lib/server/backend/client';

export function updateTournament(
	backend: BackendClient,
	tournamentId: string,
	input: TournamentEditForm
) {
	return backend.tournaments.update(tournamentId, input);
}

export function archiveTournament(backend: BackendClient, tournamentId: string) {
	return backend.tournaments.archive(tournamentId);
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

export function createScheduleMatch(
	backend: BackendClient,
	tournamentId: string,
	input: ScheduleMatchForm
) {
	const { matchId: _matchId, ...payload } = input;
	return backend.matches.create(tournamentId, payload);
}

export function updateScheduleMatch(
	backend: BackendClient,
	tournamentId: string,
	input: ScheduleMatchForm
) {
	if (!input.matchId) {
		throw new Error('Match id is required');
	}

	const { matchId, ...payload } = input;
	return backend.matches.update(tournamentId, matchId, payload);
}

export function deleteScheduleMatch(backend: BackendClient, tournamentId: string, matchId: string) {
	return backend.matches.delete(tournamentId, matchId);
}

export function createQualificationLobby(
	backend: BackendClient,
	tournamentId: string,
	input: QualificationLobbyUpsertDto
) {
	return backend.qualificationLobbies.create(tournamentId, input);
}

export function updateQualificationLobby(
	backend: BackendClient,
	tournamentId: string,
	lobbyId: string,
	input: QualificationLobbyUpsertDto
) {
	return backend.qualificationLobbies.update(tournamentId, lobbyId, input);
}

export function updateQualificationSolo(
	backend: BackendClient,
	tournamentId: string,
	input: QualificationSoloForm
) {
	const { userId, ...payload } = input;
	return backend.tournaments.qualification.updateSolo(tournamentId, userId, payload);
}

export function updateQualificationTeam(
	backend: BackendClient,
	tournamentId: string,
	input: QualificationTeamForm
) {
	const { teamId, ...payload } = input;
	return backend.tournaments.qualification.updateTeam(tournamentId, teamId, payload);
}

export function updateQualificationTeamMember(
	backend: BackendClient,
	tournamentId: string,
	input: QualificationTeamMemberForm
) {
	const { teamId, userId, ...payload } = input;
	return backend.tournaments.qualification.updateTeamMember(tournamentId, teamId, userId, payload);
}

export function assignTournamentStaff(
	backend: BackendClient,
	tournamentId: string,
	input: TournamentStaffForm
) {
	return backend.tournaments.staff.assign(tournamentId, input);
}

export function removeTournamentStaff(
	backend: BackendClient,
	tournamentId: string,
	input: TournamentStaffForm
) {
	return backend.tournaments.staff.remove(tournamentId, input.roleId, input.userId);
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
