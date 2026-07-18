import { describe, expect, it } from 'bun:test';
import { canSelectLobby, getLobbySeats, isLobbyFull } from './qualificationLobby-view';

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
});
