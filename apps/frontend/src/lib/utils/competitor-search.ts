import type { TournamentParticipantDtoOutput } from '$lib/api/generated/model';

export type CompetitorOption =
	| { type: 'player'; id: string; label: string; avatarUrl: string }
	| { type: 'team'; id: string; label: string };

export const normalizePlayers = (players: TournamentParticipantDtoOutput[]): CompetitorOption[] =>
	players.map((player) => ({
		type: 'player',
		id: player.id,
		label: player.osuUsername,
		avatarUrl: player.avatarUrl
	}));

export const normalizeTeams = (teams: { id: string; name: string }[]): CompetitorOption[] =>
	teams.map((team) => ({ type: 'team', id: team.id, label: team.name }));
