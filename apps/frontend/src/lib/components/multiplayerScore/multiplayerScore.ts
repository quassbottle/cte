export type PlayerMultiplayerScoreData = {
	osuUserId: number;
	userName: string | null;
	mods: string[] | null;
	maxCombo: number | null;
	accuracy: number | null;
	score: number;
	great: number | null;
	ok: number | null;
	miss: number | null;
	rank: string | null;
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
};

export const formatMultiplayerScore = (score: number) => new Intl.NumberFormat().format(score);

export const formatMultiplayerAccuracy = (accuracy: number | null) =>
	accuracy === null
		? null
		: new Intl.NumberFormat(undefined, {
				style: 'percent',
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(accuracy);
