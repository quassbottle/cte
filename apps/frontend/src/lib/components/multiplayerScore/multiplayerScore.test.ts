import { describe, expect, it } from 'bun:test';
import {
	formatMultiplayerAccuracy,
	formatMultiplayerScore,
	requireMultiplayerScoreDetails,
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
	rank: 'S'
} satisfies PlayerMultiplayerScoreData;

describe('multiplayer score formatting', () => {
	it('formats score and accuracy for display', () => {
		expect(formatMultiplayerScore(961684)).toBe('961,684');
		expect(formatMultiplayerAccuracy(0.9872)).toBe('98.72%');
	});

	it.each(['maxCombo', 'accuracy', 'rank'] as const)(
		'throws when synchronized %s is missing',
		(field) => {
			expect(() => requireMultiplayerScoreDetails({ ...score, [field]: null })).toThrow(
				`Multiplayer score for Player is missing ${field}`
			);
		}
	);

	it('treats missing mods as no mods', () => {
		expect(requireMultiplayerScoreDetails({ ...score, mods: null }).mods).toEqual([]);
	});

	it('returns complete synchronized score details', () => {
		expect(requireMultiplayerScoreDetails(score)).toBe(score);
	});
});
