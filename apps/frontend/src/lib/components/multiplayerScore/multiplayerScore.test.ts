import { describe, expect, it } from 'bun:test';
import {
	formatMultiplayerAccuracy,
	formatMultiplayerScore,
	playerProfileHref,
	type PlayerMultiplayerScoreData
} from './multiplayerScore';

const score = {
	osuUserId: 1,
	userName: 'Player',
	mods: [],
	maxCombo: 123,
	accuracy: 0.9872,
	score: 961684,
	great: null,
	ok: null,
	miss: null,
	rank: 'S',
	competitorId: 'player'
} satisfies PlayerMultiplayerScoreData;

describe('multiplayer score formatting', () => {
	it('formats score and accuracy for display', () => {
		expect(formatMultiplayerScore(961684)).toBe('961,684');
		expect(formatMultiplayerAccuracy(0.9872)).toBe('98.72%');
	});

	it('accepts complete synchronized score details', () => {
		expect(score.mods).toEqual([]);
	});

	it('links only synchronized users to an internal profile', () => {
		expect(playerProfileHref('user-1')).toBe('/users/user-1');
		expect(playerProfileHref(null)).toBeUndefined();
	});
});
