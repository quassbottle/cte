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
	startsAt: Date;
	endsAt: Date;
	deletedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface TournamentParticipantDto {
	id: string;
	osuId: number;
	osuUsername: string;
}

export interface TournamentTeamDto {
	id: string;
	name: string;
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
