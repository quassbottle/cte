export type TournamentType = 'classic' | 'mapping' | 'other';

export type OsuMode = 'osu' | 'taiko' | 'fruits' | 'mania';

export interface TournamentDto {
	id: string;
	name: string;
	description: string | null;
	rules: string | null;
	mode: OsuMode;
	isTeam: boolean;
	participantsCount: number;
	registrationOpen: boolean;
	creatorId: string;
	startsAt: string;
	endsAt: string;
	archivedAt: string | null;
	deletedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface TournamentParticipantDto {
	id: string;
	osuId: number;
	osuUsername: string;
	avatarUrl: string;
	seed: number | null;
}

export interface TournamentTeamDto {
	id: string;
	name: string;
	seed: number | null;
	captainId: string;
	participants: TournamentParticipantDto[];
}

export interface TournamentCreateDto {
	name: string;
	description?: string | null;
	rules?: string | null;
	mode?: OsuMode;
	isTeam?: boolean;
	registrationOpen?: boolean;
	startsAt: Date | string;
	endsAt: Date | string;
}

export interface TournamentUpdateDto {
	name?: string;
	description?: string | null;
	rules?: string | null;
	mode?: OsuMode;
	isTeam?: boolean;
	registrationOpen?: boolean;
	startsAt?: Date | string;
	endsAt?: Date | string;
}

export interface RegisterTournamentDto {
	team?: {
		name: string;
		participants: string[];
	};
}
