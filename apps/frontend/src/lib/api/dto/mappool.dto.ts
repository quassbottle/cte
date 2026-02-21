export interface MappoolDto {
	id: string;
	stageId: string;
	startsAt: Date | string;
	endsAt: Date | string;
	createdAt: Date | string;
	updatedAt: Date | string;
}

export interface MappoolBeatmapDto {
	beatmapId: string;
	mod: string;
	index: number;
	osuBeatmapsetId: number;
	osuBeatmapId: number;
	artist: string;
	title: string;
	mode: 'osu' | 'taiko' | 'fruits' | 'mania';
	difficultyName: string;
	difficulty: number;
	version: number;
	deleted: boolean;
	createdAt: Date | string;
	updatedAt: Date | string;
}
