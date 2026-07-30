export type PlayerMultiplayerScoreData = {
	gameId?: number;
	osuUserId: number;
	userId?: string | null;
	userName: string | null;
	mods: string[];
	maxCombo: number;
	accuracy: number;
	score: number;
	great: number | null;
	ok: number | null;
	miss: number | null;
	rank: string;
	competitorId: string | null;
	highlighted?: boolean;
	focused?: boolean;
};

export type MultiplayerScoreData = {
	beatmap: {
		artist: string;
		title: string;
		difficultyName: string;
		beatmapsetId: number;
		coverUrl: string;
		beatmapId: number;
		mod: string;
		tournamentMode?: 'osu' | 'taiko' | 'fruits' | 'mania';
		index?: number | null;
		difficulty?: number | null;
		deleted?: boolean;
	};
	scores: PlayerMultiplayerScoreData[];
	standings?: { score: number; place: number }[];
};

export const formatMultiplayerScore = (score: number) => new Intl.NumberFormat().format(score);

export const formatMultiplayerAccuracy = (accuracy: number) =>
	new Intl.NumberFormat(undefined, {
		style: 'percent',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(accuracy);

export const playerProfileHref = (userId?: string | null) =>
	userId ? `/users/${userId}` : undefined;
