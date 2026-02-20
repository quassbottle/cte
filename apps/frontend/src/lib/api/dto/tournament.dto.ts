export type TournamentType = 'classic' | 'mapping' | 'other';

export type OsuMode = 'osu' | 'taiko' | 'fruits' | 'mania';

export interface TournamentDto {
	id: string;
	name: string;
	startsAt: Date;
	endsAt: Date;
	mode: OsuMode;
	type: TournamentType;
	hostId: string;
	participants: number;
	participating?: boolean;
}

export interface TournamentParticipant {
	id: string;
	avatar_url: string;
	username: string;
}

export interface TournamentCreateDto {
	name: string;
	startsAt?: Date | string;
	endsAt?: Date | string | null;
	mode: OsuMode;
	type: TournamentType;
}

export interface TournamentUpdateDto {
	name?: string;
	startsAt?: Date;
	endsAt?: Date;
	mode?: OsuMode;
	type?: TournamentType;
	hostId?: string;
}
