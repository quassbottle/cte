import { describe, expect, it } from 'bun:test';
import { getMatchDisplayStatus, getNextMatchNumber } from './schedule-view';

describe('getMatchDisplayStatus', () => {
	it.each([
		['active', 'live'],
		['stopped', 'finished'],
		['completed', 'finished'],
		[null, 'soon']
	] as const)('maps %s to %s', (status, expected) => {
		expect(getMatchDisplayStatus(status)).toBe(expected);
	});
});

describe('getNextMatchNumber', () => {
	it('increments numeric strings and ignores wiki suffixes', () => {
		expect(
			getNextMatchNumber([
				{ matchNumber: '42' },
				{ matchNumber: '43c' },
				{ matchNumber: '44' }
			])
		).toBe('45');
	});
});
