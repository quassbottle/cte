import { describe, expect, test } from 'bun:test';
import { getTournamentPage } from './tournament-page.query';

describe('getTournamentPage', () => {
	test('allows an admin to edit a tournament owned by another user', async () => {
		const empty = async () => ({ data: [] });
		const backend = {
			tournaments: {
				getById: async () => ({ data: { creatorId: 'owner-id' } }),
				getParticipants: empty,
				getTeams: empty,
				getSchedule: empty,
				staff: { get: empty }
			},
			stages: { findByTournament: empty },
			qualificationLobbies: { findByTournament: empty },
			mappools: { findByTournament: empty },
			users: { getById: async () => ({ data: { id: 'owner-id' } }) }
		};

		const result = await getTournamentPage(backend as never, 'tournament-id', {
			id: 'admin-id',
			role: 'admin'
		});

		expect(result.canEditTournament).toBe(true);
	});
});
