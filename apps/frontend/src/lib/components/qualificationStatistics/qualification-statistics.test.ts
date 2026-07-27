import { describe, expect, test } from 'bun:test';
import type { QualificationStatisticsDtoOutput } from '$lib/api/generated/model';
import { sortQualificationCompetitors } from './qualification-statistics';

describe('qualification statistics', () => {
	test('sorts competitors by map place with missing results last and seed as a tie-breaker', () => {
		const competitors = [
			{ id: 'first-later', name: 'First later', seed: 3, maps: [{ osuBeatmapId: 11, gameId: 1, score: 100, place: 1 }] },
			{ id: 'second', name: 'Second', seed: 1, maps: [{ osuBeatmapId: 11, gameId: 2, score: 90, place: 2 }] },
			{
				id: 'missing',
				name: 'Missing',
				seed: 4,
				maps: [{ osuBeatmapId: 11, gameId: null, score: 0, place: 1 }]
			},
			{ id: 'first-earlier', name: 'First earlier', seed: 2, maps: [{ osuBeatmapId: 11, gameId: 3, score: 100, place: 1 }] }
		] satisfies QualificationStatisticsDtoOutput['competitors'];

		expect(sortQualificationCompetitors(competitors, 11).map(({ id }) => id)).toEqual([
			'first-earlier',
			'first-later',
			'second',
			'missing'
		]);
	});
});
