import { describe, expect, it } from 'bun:test';
import { getRankDisplay } from './rank';

describe('rank display', () => {
	it.each([
		['XH', 'SS', true],
		['X', 'SS', false],
		['SH', 'S', true],
		['S', 'S', false],
		['A', 'A', false],
		['B', 'B', false],
		['C', 'C', false],
		['D', 'D', false],
		['F', 'F', false]
	] as const)('maps %s to %s', (rank, label, hidden) => {
		expect(getRankDisplay(rank)).toMatchObject({ label, hidden });
	});

	it('uses a neutral fallback for unknown ranks', () => {
		expect(getRankDisplay('wat')).toMatchObject({ label: 'WAT', hidden: false });
	});
});
