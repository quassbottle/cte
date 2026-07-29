import type { QualificationLobbyHistoryDtoOutput } from '$lib/api/generated/model';
import type { MappoolBeatmapDto } from '$lib/api/types';
import type {
	MultiplayerScoreData,
	PlayerMultiplayerScoreData
} from '$lib/components/multiplayerScore/multiplayerScore';

export type MultiplayerHistoryData = {
	entries: {
		gameId: number;
		beatmapId: number;
		beatmap: MultiplayerScoreData['beatmap'] | null;
		scores: PlayerMultiplayerScoreData[];
		standings?: MultiplayerScoreData['standings'];
	}[];
};

export type MultiplayerHistoryTarget = {
	gameId: number;
	competitorId: string;
};

export const isHistoryTargetScore = (
	score: Pick<PlayerMultiplayerScoreData, 'gameId' | 'userId' | 'competitorId'>,
	gameId: number,
	target: MultiplayerHistoryTarget | null
) =>
	target !== null &&
	(score.gameId ?? gameId) === target.gameId &&
	(score.competitorId === target.competitorId || score.userId === target.competitorId);

export const toHistoryBeatmap = (
	beatmap: MappoolBeatmapDto | undefined
): MultiplayerScoreData['beatmap'] | null =>
	beatmap
		? {
				artist: beatmap.artist,
				title: beatmap.title,
				difficultyName: beatmap.difficultyName,
				beatmapsetId: beatmap.osuBeatmapsetId,
				coverUrl: beatmap.coverUrl,
				beatmapId: beatmap.osuBeatmapId,
				mod: beatmap.mod,
				tournamentMode: beatmap.mode,
				index: beatmap.index,
				difficulty: beatmap.difficulty,
				deleted: beatmap.deleted
			}
		: null;

export const toQualificationHistory = (
	history: QualificationLobbyHistoryDtoOutput,
	beatmaps: MappoolBeatmapDto[]
): MultiplayerHistoryData => ({
	entries: [
		...history.attempts
			.reduce<Map<number, typeof history.attempts>>((groups, attempt) => {
				const attempts = groups.get(attempt.beatmapId) ?? [];
				attempts.push(attempt);
				groups.set(attempt.beatmapId, attempts);
				return groups;
			}, new Map())
			.entries()
	].map(([beatmapId, attempts]) => ({
		gameId: attempts[0].gameId,
		beatmapId,
		beatmap: toHistoryBeatmap(beatmaps.find(({ osuBeatmapId }) => osuBeatmapId === beatmapId)),
		scores: attempts.map(({ counted, ...score }) => ({ ...score, highlighted: counted })),
		standings: history.standings
			.filter((standing) => standing.beatmapId === beatmapId)
			.map(({ score, place }) => ({ score, place }))
	}))
});
