export interface OsuBeatmapMetadataDto {
	osuBeatmapsetId: number;
	osuBeatmapId: number;
	artist: string;
	title: string;
	difficultyName: string;
	difficulty: number;
	version: number;
	deleted: boolean;
}
