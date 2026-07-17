import { describe, expect, it } from 'bun:test';
import { normalizePlayers, normalizeTeams } from './competitor-search';

describe('competitor search normalization', () => {
	it('keeps player avatars and team identity', () => {
		expect(
			normalizePlayers([
				{ id: 'p1', osuId: 1, osuUsername: 'Player', avatarUrl: 'https://avatar', seed: null }
			])
		).toEqual([{ type: 'player', id: 'p1', label: 'Player', avatarUrl: 'https://avatar' }]);
		expect(normalizeTeams([{ id: 't1', name: 'Team' }])).toEqual([
			{ type: 'team', id: 't1', label: 'Team' }
		]);
	});
});
