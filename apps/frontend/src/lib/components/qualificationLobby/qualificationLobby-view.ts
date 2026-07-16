const LOBBY_SIZE = 16;

export const getLobbySeats = (seatCount: number) => `${seatCount} / ${LOBBY_SIZE} seats`;

export const isLobbyFull = (seatCount: number) => seatCount >= LOBBY_SIZE;

export const canSelectLobby = (seatCount: number, alreadySelected: boolean) =>
	alreadySelected || !isLobbyFull(seatCount);
