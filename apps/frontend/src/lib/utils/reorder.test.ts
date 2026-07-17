import { describe, expect, test } from 'bun:test';
import { orderedBeatmapIds, withDndIds } from './reorder';

describe('mappool drag items', () => {
	const beatmaps = [{ osuBeatmapId: 10 }, { osuBeatmapId: 20 }];

	test('uses the osu beatmap id as the stable drag id', () => {
		expect(withDndIds(beatmaps)).toEqual([
			{ osuBeatmapId: 10, id: 10 },
			{ osuBeatmapId: 20, id: 20 }
		]);
	});

	test('extracts the final persisted order', () => {
		expect(orderedBeatmapIds(withDndIds(beatmaps).reverse())).toEqual([20, 10]);
	});
});
