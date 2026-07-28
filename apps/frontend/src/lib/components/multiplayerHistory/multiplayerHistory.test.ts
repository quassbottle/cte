import { describe, expect, it } from 'bun:test';
import { toQualificationHistory } from './multiplayerHistory';

describe('multiplayer history', () => {
	it('adapts qualification attempts to shared highlighted score sections', () => {
		const history = toQualificationHistory(
			{
				lastSyncedAt: '2026-07-28T10:00:00.000Z',
				attempts: [
					{
						beatmapId: 11,
						gameId: 2,
						osuUserId: 1,
						userId: 'player',
						userName: 'Player',
						score: 1_000_000,
						mods: ['NF'],
						maxCombo: 500,
						accuracy: 1,
						rank: 'SS',
						great: 300,
						ok: 0,
						miss: 0,
						counted: true
					},
					{
						beatmapId: 22,
						gameId: 1,
						osuUserId: 2,
						userId: 'other',
						userName: 'Other',
						score: 900_000,
						mods: [],
						maxCombo: 450,
						accuracy: 0.95,
						rank: 'A',
						great: null,
						ok: null,
						miss: null,
						counted: false
					}
				],
				standings: [
					{ competitorId: 'team', beatmapId: 11, gameId: 2, score: 1_900_000, place: 2 },
					{ competitorId: 'team', beatmapId: 22, gameId: 1, score: 1_800_000, place: 3 }
				]
			},
			[
				{
					osuBeatmapId: 11,
					artist: 'Artist',
					title: 'Title',
					difficultyName: 'Diff',
					osuBeatmapsetId: 10,
					mod: 'NM',
					mode: 'taiko',
					index: 1,
					difficulty: 5,
					deleted: false
				},
				{
					osuBeatmapId: 22,
					artist: 'Second',
					title: 'Map',
					difficultyName: 'Oni',
					osuBeatmapsetId: 20,
					mod: 'HD',
					mode: 'taiko',
					index: 1,
					difficulty: 6,
					deleted: false
				}
			] as never
		);

		expect(history.entries.map(({ beatmapId }) => beatmapId)).toEqual([11, 22]);
		expect(history.entries[0].scores[0]).toMatchObject({
			osuUserId: 1,
			highlighted: true
		});
		expect(history.entries[0].standings).toEqual([{ score: 1_900_000, place: 2 }]);
	});
});
