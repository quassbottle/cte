import { describe, expect, it } from 'bun:test';
import { canSelectLobby, getLobbySeats, isLobbyFull } from './qualificationLobby-view';

describe('qualification lobby view', () => {
	it('shows the 16-seat capacity and disables selection when full', () => {
		expect(getLobbySeats(16)).toBe('16 / 16 seats');
		expect(isLobbyFull(16)).toBe(true);
	});

	it('allows an existing occupant to move while a full lobby rejects newcomers', () => {
		expect(canSelectLobby(16, true)).toBe(true);
		expect(canSelectLobby(16, false)).toBe(false);
	});
});
