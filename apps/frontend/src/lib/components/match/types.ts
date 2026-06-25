import type { StageScheduleDtoOutputMatchesItemStaffItemRole } from '$lib/api/generated/model';

export type MatchPlayerView = {
	name: string;
	osuId: number;
	country: string | null;
	seed: number | null;
	score: number | null;
};

export type MatchStaffView = {
	name: string;
	osuId: number;
	initials: string;
	role: StageScheduleDtoOutputMatchesItemStaffItemRole;
};

export type MatchView = {
	id: string;
	number: number;
	date: string;
	time: string;
	player1: MatchPlayerView | null;
	player2: MatchPlayerView | null;
	staff: MatchStaffView[];
	mpUrl: string | null;
	vodUrl: string | null;
};
