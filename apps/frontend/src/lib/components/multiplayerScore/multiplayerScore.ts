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

export type CompletePlayerMultiplayerScoreData = Omit<
	PlayerMultiplayerScoreData,
	'mods' | 'maxCombo' | 'accuracy' | 'rank'
> & {
	mods: string[];
	maxCombo: number;
	accuracy: number;
	rank: string;
};

export const requireMultiplayerScoreDetails = (
	score: PlayerMultiplayerScoreData
): CompletePlayerMultiplayerScoreData => {
	for (const field of ['maxCombo', 'accuracy', 'rank'] as const) {
		if (score[field] === null) {
			throw new Error(
				`Multiplayer score for ${score.userName ?? `osu! ${score.osuUserId}`} is missing ${field}`
			);
		}
	}
	return (score.mods === null ? { ...score, mods: [] } : score) as CompletePlayerMultiplayerScoreData;
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

export const formatMultiplayerAccuracy = (accuracy: number) =>
	new Intl.NumberFormat(undefined, {
		style: 'percent',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(accuracy);
