import { describe, expect, it } from 'bun:test';
import { formatMultiplayerAccuracy, formatMultiplayerScore } from './multiplayerScore';

describe('multiplayer score formatting', () => {
	it('formats score and accuracy for display', () => {
		expect(formatMultiplayerScore(961684)).toBe('961,684');
		expect(formatMultiplayerAccuracy(0.9872)).toBe('98.72%');
		expect(formatMultiplayerAccuracy(null)).toBeNull();
	});
});
