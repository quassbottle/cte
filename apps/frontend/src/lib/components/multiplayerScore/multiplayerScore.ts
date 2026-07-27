export type PlayerMultiplayerScoreData = {
	osuUserId: number;
	userName: string | null;
	mods: string[];
	maxCombo: number;
	accuracy: number;
	score: number;
	great: number | null;
	ok: number | null;
	miss: number | null;
	rank: string;
	counted?: boolean;
};

export type MultiplayerScoreData = {
	beatmap: {
		artist: string;
		title: string;
		difficultyName: string;
		beatmapsetId: number;
		beatmapId: number;
		mod: string;
		tournamentMode?: 'osu' | 'taiko' | 'fruits' | 'mania';
		index?: number | null;
		difficulty?: number | null;
		deleted?: boolean;
	};
	scores: PlayerMultiplayerScoreData[];
	standings?: { name: string; score: number; place: number }[];
};

export const formatMultiplayerScore = (score: number) => new Intl.NumberFormat().format(score);

export const formatMultiplayerAccuracy = (accuracy: number) =>
	new Intl.NumberFormat(undefined, {
		style: 'percent',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(accuracy);
