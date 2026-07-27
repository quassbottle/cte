import type { QualificationLobbyDtoOutputReferee } from '$lib/api/generated/model';
import { getInitials } from '$lib/components/schedule/schedule-view';

const LOBBY_SIZE = 16;

export const toRefereeView = (referee: QualificationLobbyDtoOutputReferee) => ({
	id: referee.id,
	name: referee.osuUsername,
	osuId: referee.osuId,
	avatarUrl: referee.avatarUrl,
	initials: getInitials(referee.osuUsername),
	role: referee.role
});

export const getLobbySeats = (seatCount: number) => `${seatCount} / ${LOBBY_SIZE} seats`;

export const isLobbyFull = (seatCount: number) => seatCount >= LOBBY_SIZE;

export const findQualificationLobby = <T extends { id: string }>(lobbies: T[], id: string | null) =>
	lobbies.find((lobby) => lobby.id === id) ?? null;

export const canSelectLobby = (
	seatCount: number,
	alreadySelected: boolean,
	stageStartsAt: string,
	now = new Date()
) => now < new Date(stageStartsAt) && (alreadySelected || !isLobbyFull(seatCount));
