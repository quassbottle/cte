import { describe, expect, it } from 'bun:test';
import {
	canSelectLobby,
	findQualificationLobby,
	getLobbySeats,
	isLobbyFull,
	toRefereeView
} from './qualificationLobby-view';

describe('qualification lobby view', () => {
	it('shows the 16-seat capacity and disables selection when full', () => {
		expect(getLobbySeats(16)).toBe('16 / 16 seats');
		expect(isLobbyFull(16)).toBe(true);
	});

	it('allows an existing occupant to move while a full lobby rejects newcomers', () => {
		expect(canSelectLobby(16, true, '2030-01-01T00:00:00Z', new Date(0))).toBe(true);
		expect(canSelectLobby(16, false, '2030-01-01T00:00:00Z', new Date(0))).toBe(false);
	});

	it('disables selection when the qualification stage starts', () => {
		const startsAt = '2030-01-01T00:00:00Z';
		expect(canSelectLobby(1, false, startsAt, new Date(startsAt))).toBe(false);
	});

	it('resolves the selected lobby from the latest array', () => {
		const stale = { id: 'lobby', attempts: [{ score: 1 }] };
		const fresh = { id: 'lobby', attempts: [{ score: 2 }] };

		expect(findQualificationLobby([fresh], stale.id)).toBe(fresh);
		expect(findQualificationLobby([fresh], null)).toBeNull();
	});

	it('adapts a referee to the shared schedule staff view', () => {
		expect(
			toRefereeView({
				id: 'referee',
				osuId: 42,
				osuUsername: 'Ref Name',
				avatarUrl: 'https://a.ppy.sh/42',
				role: 'referee'
			})
		).toEqual({
			id: 'referee',
			name: 'Ref Name',
			osuId: 42,
			avatarUrl: 'https://a.ppy.sh/42',
			initials: 'RN',
			role: 'referee'
		});
	});
});
