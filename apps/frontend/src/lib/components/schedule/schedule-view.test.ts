import { describe, expect, it } from 'bun:test';
import { getMatchDisplayStatus } from './schedule-view';

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
