import type { MatchHistoryDtoOutput } from '$lib/api/generated/model';
import type { MappoolBeatmapDto } from '$lib/api/types';
import type { MultiplayerHistoryData } from '$lib/components/multiplayerHistory/multiplayerHistory';
import { toHistoryBeatmap } from '$lib/components/multiplayerHistory/multiplayerHistory';

export const toMatchHistory = (
	history: Pick<MatchHistoryDtoOutput, 'games'>,
	beatmaps: MappoolBeatmapDto[]
): MultiplayerHistoryData => ({
	entries: history.games.map((game) => ({
		gameId: game.gameId,
		beatmapId: game.beatmapId,
		beatmap: toHistoryBeatmap(beatmaps.find(({ osuBeatmapId }) => osuBeatmapId === game.beatmapId)),
		scores: game.scores.map((score) => ({ ...score, gameId: game.gameId }))
	}))
});
