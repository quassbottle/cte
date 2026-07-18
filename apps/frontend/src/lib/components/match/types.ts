import type { StageScheduleDtoOutputMatchesItemStaffItemRole } from '$lib/api/generated/model';

export type MatchPlayerView = {
	id: string;
	name: string;
	osuId: number;
	avatarUrl: string;
	country: string | null;
	seed: number | null;
	score: number | null;
};

export type MatchStaffView = {
	id: string;
	name: string;
	osuId: number;
	avatarUrl: string;
	initials: string;
	role: StageScheduleDtoOutputMatchesItemStaffItemRole;
};

export type MatchDisplayStatus = 'live' | 'finished' | 'soon';

export type MatchView = {
	id: string;
	number: string;
	date: string;
	time: string;
	status: MatchDisplayStatus;
	player1: MatchPlayerView | null;
	player2: MatchPlayerView | null;
	redTeam: { name: string; score: number | null } | null;
	blueTeam: { name: string; score: number | null } | null;
	staff: MatchStaffView[];
	mpUrl: string | null;
	vodUrl: string | null;
};
