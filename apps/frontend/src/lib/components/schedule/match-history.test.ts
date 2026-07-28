import { describe, expect, it } from 'bun:test';
import { toMatchHistory } from './match-history';

describe('regular match history', () => {
	it('preserves API game order and winner highlighting', () => {
		const history = toMatchHistory(
			{
				games: [
					{
						gameId: 2,
						beatmapId: 20,
						scores: [
							{
								osuUserId: 1,
								userName: 'Winner',
								score: 1_000_000,
								mods: ['NF'],
								maxCombo: 500,
								accuracy: 1,
								rank: 'SS',
								great: 300,
								ok: 0,
								miss: 0,
								highlighted: true
							}
						]
					},
					{
						gameId: 1,
						beatmapId: 99,
						scores: []
					}
				]
			} as never,
			[
				{
					osuBeatmapId: 20,
					artist: 'Artist',
					title: 'Title',
					difficultyName: 'Diff',
					osuBeatmapsetId: 10,
					mod: 'NM',
					mode: 'taiko',
					index: 1,
					difficulty: 5,
					deleted: false
				}
			] as never
		);

		expect(history.entries.map(({ gameId }) => gameId)).toEqual([2, 1]);
		expect(history.entries[0].scores[0]).toMatchObject({
			osuUserId: 1,
			highlighted: true
		});
		expect(history.entries[0].beatmap?.beatmapId).toBe(20);
		expect(history.entries[1].beatmap).toBeNull();
	});
});
