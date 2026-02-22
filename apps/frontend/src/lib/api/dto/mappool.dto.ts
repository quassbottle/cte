export interface MappoolDto {
	id: string;
	stageId: string;
	startsAt: Date | string;
	endsAt: Date | string;
	hidden: boolean;
	createdAt: Date | string;
	updatedAt: Date | string;
}

export interface MappoolCreateDto {
	stageId: string;
	startsAt: Date | string;
	endsAt: Date | string;
}

export interface MappoolAddBeatmapDto {
	mod: string;
	beatmapsetId: number;
	beatmapId: number;
}

export interface MappoolUpdateDto {
	startsAt?: Date | string;
	endsAt?: Date | string;
	hidden?: boolean;
}

export interface MappoolUpdateBeatmapDto {
	mod?: string;
	index?: number;
	beatmapsetId?: number;
	beatmapId?: number;
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
