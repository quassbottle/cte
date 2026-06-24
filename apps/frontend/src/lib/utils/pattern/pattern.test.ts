import { describe, expect, test } from 'bun:test';
import { generatePattern } from './pattern';

describe('generatePattern', () => {
	test('adds unrotated mode icons when a tournament mode is provided', () => {
		const pattern = generatePattern('tournament-with-mode', 1200, 260, 'mania');
		const modeIcons = pattern.ops.filter((op) => op.kind === 'modeIcon');

		expect(modeIcons.length).toBeGreaterThan(0);
		expect(modeIcons.every((op) => !('rotation' in op))).toBe(true);
	});
});
